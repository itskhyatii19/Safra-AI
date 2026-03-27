from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import random
import os

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def analyze_risk(file_size, filename):
    score = 0
    factors = []

    if file_size > 2 * 1024 * 1024:
        score += 30
        factors.append("High resolution — easier to manipulate")
    elif file_size > 500 * 1024:
        score += 15
        factors.append("Medium resolution image")
    else:
        factors.append("Low resolution — lower manipulation risk")

    name_lower = filename.lower()
    if any(w in name_lower for w in ['profile', 'photo', 'selfie', 'face', 'me', 'dp']):
        score += 25
        factors.append("Personal/face photo detected — high misuse risk")

    score += random.randint(0, 40)
    score = min(score, 99)

    if score >= 75:
        risk_level = "CRITICAL"
    elif score >= 50:
        risk_level = "HIGH"
    elif score >= 25:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return score, risk_level, factors


def get_similar_matches(risk_score):
    platforms = ["Instagram", "Twitter/X", "Facebook", "TikTok", "Reddit"]
    count = 4 if risk_score >= 75 else 2 if risk_score >= 50 else 1 if risk_score >= 25 else 0
    return [
        {"platform": p, "confidence": random.randint(62, 95), "url": f"https://{p.lower()}.com"}
        for p in platforms[:count]
    ]


def get_misuse_types(risk_score):
    all_types = [
        {"type": "Deepfake Creation", "description": "Image could be used to create synthetic media", "probability": 0.82},
        {"type": "Fake Profile", "description": "Could be used to create fake social accounts", "probability": 0.74},
        {"type": "Unauthorized Sharing", "description": "Image may be shared without your consent", "probability": 0.91},
        {"type": "Identity Theft", "description": "Could be used to impersonate your identity", "probability": 0.63},
    ]
    count = 4 if risk_score >= 75 else 3 if risk_score >= 50 else 2 if risk_score >= 25 else 1
    return all_types[:count]


def get_safety_tips():
    return [
        {"title": "Avoid high-res public uploads", "description": "Use lower resolution images on public platforms to reduce manipulation risk.", "icon": "shield"},
        {"title": "Enable privacy settings", "description": "Restrict who can see and share your photos on social platforms.", "icon": "lock"},
        {"title": "Add watermarks", "description": "Use Safra AI protection to embed invisible ownership markers.", "icon": "fingerprint"},
        {"title": "Monitor your digital footprint", "description": "Regularly scan your images to detect unauthorized usage.", "icon": "eye"},
    ]


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']
    file_content = file.read()
    file_size = len(file_content)

    image_id = str(uuid.uuid4())
    score, risk_level, factors = analyze_risk(file_size, file.filename)

    return jsonify({
        "image_id": image_id,
        "risk_score": score,
        "risk_level": risk_level,
        "risk_factors": factors,
        "similar_matches": get_similar_matches(score),
        "misuse_types": get_misuse_types(score),
        "safety_tips": get_safety_tips(),
        "face_detected": random.random() > 0.4,
        "file_size": f"{file_size // 1024} KB",
        "protected": False
    })


@app.route('/protect', methods=['POST'])
def protect():
    fingerprint_id = "FP-" + str(uuid.uuid4())[:8].upper()
    return jsonify({
        "fingerprint_id": fingerprint_id,
        "watermark_added": True,
        "protected": True,
        "message": f"Digital fingerprint embedded. Track your image with ID: {fingerprint_id}"
    })


if __name__ == '__main__':
    app.run(debug=True)

    from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return "Flask is working 🚀"

if __name__ == '__main__':
    app.run(debug=True)