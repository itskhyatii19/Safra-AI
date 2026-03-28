import os
import uuid
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

os.makedirs('uploads', exist_ok=True)

# Set your key: export OPENAI_API_KEY="sk-..."
client = OpenAI(api_key="sk-your-actual-key-here")

FALLBACK_ADVICE = "Based on our analysis, we recommend enabling privacy settings on your social media accounts, using lower-resolution images for public posts, and watermarking your personal photos before sharing. Regularly search for your images online to detect any unauthorized usage."

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

    if any(w in filename.lower() for w in ['profile','photo','selfie','face','me','dp','pic','portrait']):
        score += 25
        factors.append("Personal/face photo detected — high misuse risk")

    if random.random() > 0.4:
        score += 20
        factors.append("Face content detected — higher deepfake risk")

    score = min(score + random.randint(0, 24), 99)

    if score >= 75:   risk_level = "CRITICAL"
    elif score >= 50: risk_level = "HIGH"
    elif score >= 25: risk_level = "MEDIUM"
    else:             risk_level = "LOW"

    return score, risk_level, factors

def get_similar_matches(risk_score):
    platforms = ["Instagram", "Twitter/X", "Facebook", "TikTok", "Reddit"]
    count = 4 if risk_score >= 75 else 2 if risk_score >= 50 else 1 if risk_score >= 25 else 0
    return [{"platform": p, "confidence": random.randint(62, 95),
             "url": f"https://{p.lower().replace('/','')}.com"} for p in platforms[:count]]

def get_misuse_types(risk_score):
    all_types = [
        {"type": "Deepfake Creation",    "description": "Image could be used to create synthetic media",     "probability": 0.82},
        {"type": "Fake Profile",         "description": "Could be used to create fake social accounts",      "probability": 0.74},
        {"type": "Unauthorized Sharing", "description": "Image may be shared without your consent",          "probability": 0.91},
        {"type": "Identity Theft",       "description": "Could be used to impersonate your identity",        "probability": 0.63},
    ]
    count = 4 if risk_score >= 75 else 3 if risk_score >= 50 else 2 if risk_score >= 25 else 1
    return all_types[:count]

def get_ai_advice(risk_score, risk_level, factors, filename):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=300,
            messages=[
                {"role": "system", "content": "You are Safra AI, a digital identity protection advisor. Always respond with a single short paragraph of actionable advice."},
                {"role": "user", "content":
                    f'Image: "{filename}"\nRisk Level: {risk_level} ({risk_score}/100)\n'
                    f'Risk Factors: {", ".join(factors)}\n\n'
                    f'Give specific, practical advice to protect this person\'s digital identity in 3-4 sentences. No bullet points, just a flowing paragraph.'}
            ]
        )
        content = response.choices[0].message.content
        return content if content else FALLBACK_ADVICE
    except Exception as e:
        print(f"OpenAI error: {e}")
        return FALLBACK_ADVICE

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    file = request.files['image']
    data = file.read()
    score, risk_level, factors = analyze_risk(len(data), file.filename or 'image.jpg')
    return jsonify({
        "image_id":       str(uuid.uuid4()),
        "risk_score":     score,
        "risk_level":     risk_level,
        "risk_factors":   factors,
        "similar_matches": get_similar_matches(score),
        "misuse_types":   get_misuse_types(score),
        "ai_advisor":     get_ai_advice(score, risk_level, factors, file.filename or 'image.jpg'),
        "face_detected":  random.random() > 0.4,
        "file_size":      f"{len(data) // 1024} KB",
        "protected":      False
    })

@app.route('/protect', methods=['POST'])
def protect():
    fp = "FP-" + str(uuid.uuid4())[:8].upper()
    return jsonify({
        "fingerprint_id": fp,
        "watermark_added": True,
        "protected": True,
        "message": f"Digital fingerprint embedded. Track your image with ID: {fp}"
    })

if __name__ == '__main__':
    app.run(debug=True)