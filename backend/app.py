from datetime import datetime, date
from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection
from datetime import date

app = Flask(__name__)
CORS(app)


def calculate_student_insights(cursor, student_id):
    cursor.execute(
        """
        SELECT
            v.violation_id,
            v.incident_date,
            v.severity,
            c.category_name,
            r.offense_variety
        FROM violations v
        JOIN rules r ON v.rule_id = r.rule_id
        JOIN offense_categories c ON r.category_id = c.category_id
        WHERE v.student_id = %s
        ORDER BY v.incident_date ASC
        """,
        (student_id,)
    )

    records = cursor.fetchall()

    if not records:
        return {
            "risk_score": 0,
            "risk_level": "Low",
            "patterns": ["No pattern detected"]
        }

    total_violations = len(records)
    severities = [int(r["severity"])
                  for r in records if r["severity"] is not None]
    average_severity = sum(severities) / len(severities) if severities else 0

    last_date = records[-1]["incident_date"]

    if isinstance(last_date, str):
        last_date = datetime.strptime(last_date, "%Y-%m-%d").date()

    days_since_last = (date.today() - last_date).days

    if days_since_last <= 30:
        recency_score = 3
    elif days_since_last <= 90:
        recency_score = 2
    else:
        recency_score = 1

    risk_score = round(
        min(10, (total_violations * 1.5) +
            (average_severity * 0.5) + recency_score),
        1
    )

    if risk_score >= 7:
        risk_level = "High"
    elif risk_score >= 4:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    patterns = []

    category_counts = {}
    for record in records:
        category = record["category_name"]
        category_counts[category] = category_counts.get(category, 0) + 1

    for category, count in category_counts.items():
        if count >= 2:
            patterns.append(f"Repeated {category} violations")

    minor_count = sum(1 for severity in severities if severity <= 3)
    if minor_count >= 3:
        patterns.append("Habitual minor violations")

    if len(severities) >= 2 and severities[-1] > severities[-2]:
        patterns.append("Escalation behavior detected")

    if not patterns:
        patterns.append("No pattern detected")

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "patterns": patterns
    }


def generate_explanation(rule, insights):
    patterns_text = ", ".join(insights["patterns"])

    return (
        f"The recommended sanction was generated because the selected offense has a "
        f"severity score of {rule['severity']}/10. The system used the handbook provision "
        f"{rule['provision']} and recommended: {rule['recommended_sanction']}. "
        f"The student's current risk level is {insights['risk_level']} "
        f"with a risk score of {insights['risk_score']}/10. "
        f"Detected pattern: {patterns_text}."
    )


# login
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT user_id, full_name, email, role
        FROM users
        WHERE email = %s AND password = %s
        """,
        (email, password)
    )

    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if user:
        return jsonify({
            "message": "Login successful.",
            "user": user
        }), 200

    return jsonify({"message": "Invalid email or password."}), 401

# students get - retrieve all students


@app.route("/api/students", methods=["GET"])
def get_students():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM students ORDER BY student_id DESC")
    students = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(students)


# students post - add new student
@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.json

    conn = get_db_connection()
    cursor = conn.cursor()

    sql = """
        INSERT INTO students
        (student_number, full_name, year_level, section, email, phone_number)
        VALUES (%s, %s, %s, %s, %s, %s)
    """

    values = (
        data.get("student_number"),
        data.get("full_name"),
        data.get("year_level"),
        data.get("section"),
        data.get("email"),
        data.get("phone_number")
    )

    cursor.execute(sql, values)
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Student added successfully"}), 201


# categories get - retrieve all offense categories
@app.route("/api/categories", methods=["GET"])
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT category_id, category_name
        FROM offense_categories
        ORDER BY category_name ASC
        """
    )

    categories = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(categories)

# rules get - retrieve all rules, optionally filtered by category_id


@app.route("/api/rules", methods=["GET"])
def get_rules():
    category_id = request.args.get("category_id")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if category_id:
        cursor.execute(
            """
            SELECT 
                rule_id,
                category_id,
                offense_variety,
                severity,
                recommended_sanction,
                provision,
                is_active,
                modified_date
            FROM rules
            WHERE category_id = %s AND is_active = TRUE
            ORDER BY offense_variety ASC
            """,
            (category_id,)
        )
    else:
        cursor.execute(
            """
            SELECT 
                r.rule_id,
                r.category_id,
                c.category_name,
                r.offense_variety,
                r.severity,
                r.recommended_sanction,
                r.provision,
                r.is_active,
                r.modified_date
            FROM rules r
            JOIN offense_categories c ON r.category_id = c.category_id
            ORDER BY r.rule_id DESC
            """
        )

    rules = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(rules)


# rules add new rule
@app.route("/api/rules", methods=["POST"])
def add_rule():
    data = request.json

    category = data.get("category")
    variety = data.get("variety")
    severity = data.get("severity")
    sanction = data.get("sanction")
    provision = data.get("provision")
    active = data.get("active", True)

    if not category or not variety or not severity or not sanction or not provision:
        return jsonify({"message": "Please fill in all required fields."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

# find category id
    cursor.execute(
        """
        SELECT category_id
        FROM offense_categories
        WHERE category_name = %s
        """,
        (category,)
    )

    category_row = cursor.fetchone()

    if not category_row:
        cursor.close()
        conn.close()
        return jsonify({"message": "Category not found."}), 404

    category_id = category_row["category_id"]

# inset new rule
    cursor.execute(
        """
        INSERT INTO rules
        (
            category_id,
            offense_variety,
            severity,
            recommended_sanction,
            provision,
            is_active,
            modified_date
        )
        VALUES (%s, %s, %s, %s, %s, %s, CURRENT_DATE)
        """,
        (
            category_id,
            variety,
            severity,
            sanction,
            provision,
            active
        )
    )

    conn.commit()
    new_rule_id = cursor.lastrowid

    cursor.execute(
        "INSERT INTO rule_versions (rule_id, action_type, rule_name, category_name, description, changed_by) VALUES (%s, 'created', %s, %s, 'Rule was created.', %s)",
        (new_rule_id, variety, category, data.get("changed_by", 1))
    )
    cursor.close()
    conn.close()

    return jsonify({
        "message": "Rule added successfully.",
        "rule_id": new_rule_id
    }), 201

# rule edit - update rule
# rules update existing rule


@app.route("/api/rules/<int:rule_id>", methods=["PUT"])
def update_rule(rule_id):
    data = request.json

    category = data.get("category")
    variety = data.get("variety")
    severity = data.get("severity")
    sanction = data.get("sanction")
    provision = data.get("provision")
    active = data.get("active", True)
    changed_by = data.get("changed_by", 1)

    if not category or not variety or not severity or not sanction or not provision:
        return jsonify({"message": "Please fill in all required fields."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT category_id
        FROM offense_categories
        WHERE category_name = %s
        """,
        (category,)
    )

    category_row = cursor.fetchone()

    if not category_row:
        cursor.close()
        conn.close()
        return jsonify({"message": "Category not found."}), 404

    category_id = category_row["category_id"]

    cursor.execute(
        """
        UPDATE rules
        SET
            category_id = %s,
            offense_variety = %s,
            severity = %s,
            recommended_sanction = %s,
            provision = %s,
            is_active = %s,
            modified_date = CURRENT_DATE
        WHERE rule_id = %s
        """,
        (
            category_id,
            variety,
            severity,
            sanction,
            provision,
            active,
            rule_id
        )
    )

    cursor.execute(
        """
        INSERT INTO rule_versions
        (rule_id, action_type, rule_name, category_name, description, changed_by)
        VALUES (%s, 'updated', %s, %s, 'Rule was updated.', %s)
        """,
        (rule_id, variety, category, changed_by)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Rule updated successfully."}), 200

# rules history to see previous versions of rules


@app.route("/api/rules/history", methods=["GET"])
def get_rule_history():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            rv.version_id,
            rv.rule_id,
            rv.action_type,
            rv.rule_name,
            rv.category_name,
            rv.description,
            rv.changed_at,
            u.full_name AS changed_by
        FROM rule_versions rv
        LEFT JOIN users u ON rv.changed_by = u.user_id
        ORDER BY rv.changed_at DESC
        """
    )

    history = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(history)


# violations get - retrieve all violations with student and rule details
@app.route("/api/violations", methods=["GET"])
def get_violations():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            v.violation_id,
            v.student_id,
            s.student_number,
            s.full_name AS student_name,
            s.year_level,
            s.section,
            v.rule_id,
            c.category_name,
            r.offense_variety,
v.incident_date,
DATE_FORMAT(v.incident_date, '%d %b %Y') AS incident_date_display,
DATE_FORMAT(v.created_at, '%h:%i %p') AS created_time,
v.created_at,
v.incident_description,
            v.offense_count,
            v.severity,
            v.recommended_sanction,
            v.provision,
            v.status,
            v.final_sanction,
            v.override_justification,
            u.full_name AS created_by_name
        FROM violations v
        JOIN students s ON v.student_id = s.student_id
        JOIN rules r ON v.rule_id = r.rule_id
        JOIN offense_categories c ON r.category_id = c.category_id
        LEFT JOIN users u ON v.created_by = u.user_id
        ORDER BY v.incident_date DESC
        """
    )

    violations = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(violations)


def calculate_student_risk(cursor, student_id):
    cursor.execute(
        """
        SELECT
            v.violation_id,
            v.incident_date,
            v.severity,
            c.category_name
        FROM violations v
        JOIN rules r ON v.rule_id = r.rule_id
        JOIN offense_categories c ON r.category_id = c.category_id
        WHERE v.student_id = %s
        ORDER BY v.incident_date ASC
        """,
        (student_id,)
    )

    records = cursor.fetchall()

    if not records:
        return {
            "risk_score": 0,
            "risk_level": "Low",
            "behavior_pattern": "No Pattern Detected"
        }

    total_violations = len(records)
    average_severity = sum(float(r["severity"])
                           for r in records) / total_violations

    latest_date = records[-1]["incident_date"]

    if hasattr(latest_date, "date"):
        latest_date = latest_date.date()

    days_since_last = (date.today() - latest_date).days

    frequency_score = min(total_violations, 4)

    if average_severity >= 8:
        severity_score = 3
    elif average_severity >= 5:
        severity_score = 2
    else:
        severity_score = 1

    if days_since_last <= 30:
        recency_score = 3
    elif days_since_last <= 90:
        recency_score = 2
    else:
        recency_score = 1

    risk_score = frequency_score + severity_score + recency_score

    if risk_score >= 7:
        risk_level = "High"
    elif risk_score >= 4:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    behavior_pattern = detect_behavior_pattern(records)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "behavior_pattern": behavior_pattern
    }


def detect_behavior_pattern(records):
    if len(records) < 2:
        return "No Pattern Detected"

    category_counts = {}

    for record in records:
        category = record["category_name"]
        category_counts[category] = category_counts.get(category, 0) + 1

    for category, count in category_counts.items():
        if count >= 2:
            return f"Repeated {category} Breach"

    minor_count = sum(1 for record in records if float(
        record["severity"]) <= 4)

    if minor_count >= 3:
        return "Habitual Minor Violations"

    first_severity = float(records[0]["severity"])
    latest_severity = float(records[-1]["severity"])

    if latest_severity > first_severity:
        return "Escalation Behavior"

    return "No Pattern Detected"


def generate_explanation(rule, offense_count, risk_data):
    return (
        f"The system recommended this sanction because the selected offense is "
        f"{rule['offense_variety']} under {rule['category_name']}. "
        f"This rule has a severity score of {rule['severity']}/10 and is supported by "
        f"{rule['provision']}. This is offense number {offense_count} for this student "
        f"under the same rule. The student is currently classified as "
        f"{risk_data['risk_level']} Risk with the pattern: {risk_data['behavior_pattern']}."
    )

# violations post - add new violation and calculate offense count, risk, and explanation


@app.route("/api/violations", methods=["POST"])
def add_violation():
    data = request.json

    student_id = data.get("student_id")
    rule_id = data.get("rule_id")
    incident_date = data.get("incident_date")
    incident_description = data.get("incident_description")
    created_by = data.get("created_by")

    if not student_id or not rule_id or not incident_date or not incident_description:
        return jsonify({"message": "Please fill in all required fields."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            r.severity,
            r.recommended_sanction,
            r.provision,
            r.offense_variety,
            c.category_name
        FROM rules r
        JOIN offense_categories c ON r.category_id = c.category_id
        WHERE r.rule_id = %s
        """,
        (rule_id,)
    )

    rule = cursor.fetchone()

    if not rule:
        cursor.close()
        conn.close()
        return jsonify({"message": "Selected rule was not found."}), 404

    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM violations
        WHERE student_id = %s AND rule_id = %s
        """,
        (student_id, rule_id)
    )

    previous = cursor.fetchone()
    offense_count = previous["total"] + 1

    cursor.execute(
        """
        INSERT INTO violations
        (
            student_id,
            rule_id,
            incident_date,
            incident_description,
            offense_count,
            severity,
            recommended_sanction,
            provision,
            status,
            created_by
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s)
        """,
        (
            student_id,
            rule_id,
            incident_date,
            incident_description,
            offense_count,
            rule["severity"],
            rule["recommended_sanction"],
            rule["provision"],
            created_by
        )
    )

    conn.commit()

    risk_data = calculate_student_risk(cursor, student_id)
    explanation = generate_explanation(rule, offense_count, risk_data)

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Violation submitted successfully.",
        "offense_count": offense_count,
        "recommended_sanction": rule["recommended_sanction"],
        "severity": rule["severity"],
        "provision": rule["provision"],
        "risk_score": risk_data["risk_score"],
        "risk_level": risk_data["risk_level"],
        "behavior_pattern": risk_data["behavior_pattern"],
        "explanation": explanation
    }), 201

# dashboard summary - retrieve the total number of students, total violations, pending actions, and repeat offenders for dashboard display


@app.route("/api/dashboard/summary", methods=["GET"])
def dashboard_summary():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total_students FROM students")
    total_students = cursor.fetchone()["total_students"]

    cursor.execute("SELECT COUNT(*) AS total_violations FROM violations")
    total_violations = cursor.fetchone()["total_violations"]

    cursor.execute(
        """
        SELECT COUNT(*) AS pending_actions
        FROM violations
        WHERE status = 'pending'
        """
    )
    pending_actions = cursor.fetchone()["pending_actions"]

    cursor.execute(
        """
        SELECT COUNT(*) AS repeat_offenders
        FROM (
            SELECT student_id
            FROM violations
            GROUP BY student_id
            HAVING COUNT(*) >= 2
        ) AS repeated
        """
    )
    repeat_offenders = cursor.fetchone()["repeat_offenders"]

    cursor.close()
    conn.close()

    return jsonify({
        "total_students": total_students,
        "total_violations": total_violations,
        "pending_actions": pending_actions,
        "repeat_offenders": repeat_offenders
    })

# reports summary - retrieve report analytics data


@app.route("/api/reports/summary", methods=["GET"])
def reports_summary():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            c.category_name AS label,
            COUNT(*) AS count
        FROM violations v
        JOIN rules r ON v.rule_id = r.rule_id
        JOIN offense_categories c ON r.category_id = c.category_id
        GROUP BY c.category_name
        ORDER BY count DESC
        """
    )
    category_data = cursor.fetchall()

    cursor.execute(
        """
        SELECT
            s.year_level AS label,
            COUNT(*) AS count
        FROM violations v
        JOIN students s ON v.student_id = s.student_id
        GROUP BY s.year_level
        ORDER BY s.year_level ASC
        """
    )
    year_level_data = cursor.fetchall()

    cursor.execute(
        """
        SELECT
            s.student_id,
            s.student_number,
            s.full_name,
            s.year_level,
            s.section,
            COUNT(v.violation_id) AS violations
        FROM violations v
        JOIN students s ON v.student_id = s.student_id
        GROUP BY s.student_id, s.student_number, s.full_name, s.year_level, s.section
        HAVING COUNT(v.violation_id) >= 2
        ORDER BY violations DESC
        """
    )
    repeat_rows = cursor.fetchall()

    repeat_offenders = []

    for student in repeat_rows:
        cursor.execute(
            """
            SELECT
                c.category_name,
                r.offense_variety,
                v.incident_date
            FROM violations v
            JOIN rules r ON v.rule_id = r.rule_id
            JOIN offense_categories c ON r.category_id = c.category_id
            WHERE v.student_id = %s
            ORDER BY v.incident_date DESC
            """,
            (student["student_id"],)
        )

        records = cursor.fetchall()

        repeat_offenders.append({
            "id": student["student_number"],
            "name": student["full_name"],
            "year": student["year_level"],
            "section": student["section"],
            "violations": student["violations"],
            "records": [
                {
                    "category": record["category_name"],
                    "detail": f"{record['offense_variety']} - {record['incident_date']}"
                }
                for record in records
            ]
        })

    cursor.execute(
        """
        SELECT
            s.full_name AS student,
            r.offense_variety AS offense,
            v.recommended_sanction AS recommended,
            COALESCE(v.final_sanction, v.recommended_sanction) AS final,
            CASE
                WHEN v.final_sanction IS NOT NULL
                     AND v.final_sanction != v.recommended_sanction
                THEN 'Overridden'
                ELSE 'Accepted'
            END AS status
        FROM violations v
        JOIN students s ON v.student_id = s.student_id
        JOIN rules r ON v.rule_id = r.rule_id
        ORDER BY v.incident_date DESC
        LIMIT 10
        """
    )
    sanction_logs = cursor.fetchall()

    cursor.execute(
        """
        SELECT
            DATE_FORMAT(incident_date, '%b') AS month,
            COUNT(*) AS value
        FROM violations
        GROUP BY MONTH(incident_date), DATE_FORMAT(incident_date, '%b')
        ORDER BY MONTH(incident_date)
        """
    )
    trend_data = cursor.fetchall()

    cursor.execute("SELECT COUNT(*) AS total FROM violations")
    total_violations = cursor.fetchone()["total"]

    cursor.execute(
        """
        SELECT COUNT(DISTINCT student_id) AS total
        FROM violations
        """
    )
    students_with_violations = cursor.fetchone()["total"]

    cursor.execute(
        """
        SELECT COUNT(*) AS accepted
        FROM violations
        WHERE final_sanction IS NULL OR final_sanction = recommended_sanction
        """
    )
    accepted = cursor.fetchone()["accepted"]

    override_rate = 0
    if total_violations > 0:
        override_rate = round(
            ((total_violations - accepted) / total_violations) * 100, 1)

    cursor.close()
    conn.close()

    return jsonify({
        "categoryData": category_data,
        "yearLevelData": year_level_data,
        "repeatOffenders": repeat_offenders,
        "sanctionLogs": sanction_logs,
        "trendData": trend_data,
        "summaryStats": {
            "totalViolations": total_violations,
            "studentsWithViolations": students_with_violations,
            "accepted": accepted,
            "overrideRate": override_rate
        }
    })


if __name__ == "__main__":
    app.run(debug=True)
