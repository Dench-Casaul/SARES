from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection

app = Flask(__name__)
CORS(app)


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


# violations post - add new violation and calculate offense count and recommended sanction
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
        SELECT severity, recommended_sanction, provision
        FROM rules
        WHERE rule_id = %s
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

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Violation submitted successfully.",
        "offense_count": offense_count,
        "recommended_sanction": rule["recommended_sanction"]
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

    # violations by category
    cursor.execute(
        """
        SELECT 
            c.category_name AS label,
            COUNT(v.violation_id) AS count
        FROM offense_categories c
        LEFT JOIN rules r ON c.category_id = r.category_id
        LEFT JOIN violations v ON r.rule_id = v.rule_id
        GROUP BY c.category_id, c.category_name
        ORDER BY c.category_name ASC
        """
    )
    category_data = cursor.fetchall()

    # violations by year level
    cursor.execute(
        """
        SELECT 
            s.year_level AS label,
            COUNT(v.violation_id) AS count
        FROM students s
        LEFT JOIN violations v ON s.student_id = v.student_id
        GROUP BY s.year_level
        ORDER BY s.year_level ASC
        """
    )
    year_level_data = cursor.fetchall()

    # repeat offenders
    cursor.execute(
        """
        SELECT 
            s.full_name AS name,
            s.student_number AS id,
            s.year_level AS year,
            s.section AS section,
            COUNT(v.violation_id) AS violations
        FROM students s
        JOIN violations v ON s.student_id = v.student_id
        GROUP BY s.student_id, s.full_name, s.student_number, s.year_level, s.section
        HAVING COUNT(v.violation_id) >= 2
        ORDER BY violations DESC
        """
    )
    repeat_offenders = cursor.fetchall()

    # add violation records per repeat offender
    for offender in repeat_offenders:
        cursor.execute(
            """
            SELECT
                c.category_name AS category,
                CONCAT(
                    DATE_FORMAT(v.incident_date, '%Y-%m-%d'),
                    ' • ',
                    COALESCE(v.final_sanction, v.recommended_sanction)
                ) AS detail
            FROM violations v
            JOIN rules r ON v.rule_id = r.rule_id
            JOIN offense_categories c ON r.category_id = c.category_id
            JOIN students s ON v.student_id = s.student_id
            WHERE s.student_number = %s
            ORDER BY v.incident_date DESC
            LIMIT 3
            """,
            (offender["id"],)
        )

        offender["records"] = cursor.fetchall()

    # sanction decision logs
    cursor.execute(
        """
        SELECT 
            s.full_name AS student,
            CONCAT(c.category_name, ' - ', r.offense_variety) AS offense,
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
        JOIN offense_categories c ON r.category_id = c.category_id
        ORDER BY v.incident_date DESC
        LIMIT 10
        """
    )
    sanction_logs = cursor.fetchall()

    # monthly violation trends
    cursor.execute(
        """
        SELECT 
            DATE_FORMAT(incident_date, '%M') AS month,
            COUNT(violation_id) AS value
        FROM violations
        GROUP BY MONTH(incident_date), DATE_FORMAT(incident_date, '%M')
        ORDER BY MONTH(incident_date)
        """
    )
    trend_data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify({
        "categoryData": category_data,
        "yearLevelData": year_level_data,
        "repeatOffenders": repeat_offenders,
        "sanctionLogs": sanction_logs,
        "trendData": trend_data
    })


if __name__ == "__main__":
    app.run(debug=True)
