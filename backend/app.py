from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return jsonify({"message": "SARES backend is running"})

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


@app.route("/api/students", methods=["GET"])
def get_students():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM students ORDER BY student_id DESC")
    students = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(students)


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


if __name__ == "__main__":
    app.run(debug=True)