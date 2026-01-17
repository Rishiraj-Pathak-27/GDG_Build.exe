# Blood Matching Model Server
# Uses the Hugging Face model: bhyulljz/MLModelTwo (XGBoost blood matching model)

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os
from huggingface_hub import hf_hub_download

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Model configuration
MODEL_ID = "bhyulljz/MLModelTwo"
MODEL_FILE = "blood_match_xgboost.pkl"
model = None

def load_model():
    """Download and load the XGBoost model from Hugging Face"""
    global model
    try:
        # Download model from Hugging Face
        print(f"Downloading model from {MODEL_ID}...")
        model_path = hf_hub_download(repo_id=MODEL_ID, filename=MODEL_FILE)
        
        # Load the pickle file
        print(f"Loading model from {model_path}...")
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        
        print("Model loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

# Blood type compatibility matrix
BLOOD_COMPATIBILITY = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'],
}

def get_compatible_donor_types(recipient_blood_type):
    """Get all blood types that can donate to this recipient"""
    compatible = []
    for donor_type, can_donate_to in BLOOD_COMPATIBILITY.items():
        if recipient_blood_type in can_donate_to:
            compatible.append(donor_type)
    return compatible

def prepare_features(donor, recipient):
    """Prepare feature vector for the XGBoost model"""
    # Blood type encoding
    blood_types = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    
    features = {
        # Donor features
        'donor_blood_type': blood_types.index(donor.get('bloodType', 'O+')) if donor.get('bloodType') in blood_types else 0,
        'donor_age': donor.get('age', 30),
        'donor_gender': 1 if donor.get('gender') == 'Male' else 0,
        'donor_weight': donor.get('weight', 70),
        'donor_hemoglobin': donor.get('hemoglobinLevel', 14),
        'donor_total_donations': donor.get('totalDonations', 0),
        'donor_willing_emergency': 1 if donor.get('willingForEmergency') else 0,
        'donor_rh_C': 1 if donor.get('rhVariants', {}).get('C') else 0,
        'donor_rh_c': 1 if donor.get('rhVariants', {}).get('c') else 0,
        'donor_rh_E': 1 if donor.get('rhVariants', {}).get('E') else 0,
        'donor_rh_e': 1 if donor.get('rhVariants', {}).get('e') else 0,
        'donor_kell': 1 if donor.get('kell') else 0,
        'donor_duffy': 1 if donor.get('duffy') else 0,
        'donor_kidd': 1 if donor.get('kidd') else 0,
        
        # Recipient features  
        'recipient_blood_type': blood_types.index(recipient.get('bloodType', 'O+')) if recipient.get('bloodType') in blood_types else 0,
        'recipient_age': recipient.get('age', 30),
        'recipient_gender': 1 if recipient.get('gender') == 'Male' else 0,
        'recipient_weight': recipient.get('patientWeight', 70),
        'recipient_units_needed': recipient.get('units', 1),
        'recipient_urgency': ['standard', 'medium', 'high', 'critical'].index(recipient.get('urgency', 'standard')),
        'recipient_rh_C': 1 if recipient.get('rhVariants', {}).get('C') else 0,
        'recipient_rh_c': 1 if recipient.get('rhVariants', {}).get('c') else 0,
        'recipient_rh_E': 1 if recipient.get('rhVariants', {}).get('E') else 0,
        'recipient_rh_e': 1 if recipient.get('rhVariants', {}).get('e') else 0,
        'recipient_kell': 1 if recipient.get('kell') else 0,
        'recipient_duffy': 1 if recipient.get('duffy') else 0,
        'recipient_kidd': 1 if recipient.get('kidd') else 0,
        'recipient_irradiated': 1 if recipient.get('irradiatedBlood') else 0,
        'recipient_cmv_negative': 1 if recipient.get('cmvNegative') else 0,
        'recipient_washed_cells': 1 if recipient.get('washedCells') else 0,
        'recipient_leukocyte_reduced': 1 if recipient.get('leukocyteReduced') else 0,
    }
    
    return np.array(list(features.values())).reshape(1, -1)

def check_hard_stops(donor):
    """Check for permanent deferrals"""
    hard_stops = []
    if donor.get('hivStatus'): hard_stops.append('HIV positive')
    if donor.get('hepatitisB'): hard_stops.append('Hepatitis B')
    if donor.get('hepatitisC'): hard_stops.append('Hepatitis C')
    if donor.get('htlv'): hard_stops.append('HTLV positive')
    if donor.get('ivDrugUse'): hard_stops.append('IV drug use history')
    return hard_stops

def check_temporary_deferrals(donor):
    """Check for temporary deferrals"""
    warnings = []
    if donor.get('recentColdFlu'): warnings.append('Recent cold/flu')
    if donor.get('recentTattoo'): warnings.append('Recent tattoo')
    if donor.get('recentSurgery'): warnings.append('Recent surgery')
    if donor.get('pregnant'): warnings.append('Pregnant')
    if donor.get('recentVaccination'): warnings.append('Recent vaccination')
    if donor.get('recentTravel'): warnings.append('Recent travel')
    return warnings

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_id': MODEL_ID
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Predict compatibility score for a donor-recipient pair"""
    try:
        data = request.json
        donor = data.get('donor', {})
        recipient = data.get('recipient', {})
        
        # Check blood type compatibility first
        compatible_types = get_compatible_donor_types(recipient.get('bloodType', ''))
        if donor.get('bloodType') not in compatible_types:
            return jsonify({
                'compatible': False,
                'score': 0,
                'reason': 'Blood type incompatible'
            })
        
        # Check hard stops
        hard_stops = check_hard_stops(donor)
        if hard_stops:
            return jsonify({
                'compatible': False,
                'score': 0,
                'reason': f'Permanent deferral: {", ".join(hard_stops)}'
            })
        
        # Use ML model if loaded
        if model is not None:
            features = prepare_features(donor, recipient)
            try:
                # Get probability prediction
                if hasattr(model, 'predict_proba'):
                    proba = model.predict_proba(features)[0]
                    score = float(proba[1] * 100) if len(proba) > 1 else float(proba[0] * 100)
                else:
                    prediction = model.predict(features)[0]
                    score = float(prediction * 100) if prediction <= 1 else float(prediction)
            except Exception as e:
                print(f"Model prediction error: {e}")
                # Fallback to rule-based
                score = calculate_rule_based_score(donor, recipient)
        else:
            # Fallback to rule-based scoring
            score = calculate_rule_based_score(donor, recipient)
        
        # Get warnings
        warnings = check_temporary_deferrals(donor)
        
        return jsonify({
            'compatible': True,
            'score': min(100, max(0, score)),
            'warnings': warnings,
            'model_used': model is not None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def calculate_rule_based_score(donor, recipient):
    """Fallback rule-based scoring"""
    score = 50  # Base score for compatible blood type
    
    # Exact blood type match bonus
    if donor.get('bloodType') == recipient.get('bloodType'):
        score += 20
    
    # Antigen matching
    donor_rh = donor.get('rhVariants', {})
    recipient_rh = recipient.get('rhVariants', {})
    for variant in ['C', 'c', 'E', 'e']:
        if recipient_rh.get(variant) and donor_rh.get(variant):
            score += 3
    
    # Other antigens
    if recipient.get('kell') and donor.get('kell'): score += 3
    if recipient.get('duffy') and donor.get('duffy'): score += 3
    if recipient.get('kidd') and donor.get('kidd'): score += 3
    
    # Experience bonus
    if donor.get('totalDonations', 0) > 5: score += 5
    
    # Emergency availability
    if recipient.get('urgency') == 'critical' and donor.get('willingForEmergency'):
        score += 10
    
    return min(100, score)

@app.route('/match', methods=['POST'])
def match_donors():
    """Find and rank matching donors for a blood request"""
    try:
        data = request.json
        print(f"Received match request: {data.keys() if data else 'No data'}")
        
        recipient = data.get('recipientRequest', {})
        donors = data.get('availableDonors', [])
        
        print(f"Recipient blood type: {recipient.get('bloodType')}")
        print(f"Number of donors: {len(donors)}")
        
        compatible_types = get_compatible_donor_types(recipient.get('bloodType', ''))
        print(f"Compatible donor types: {compatible_types}")
        
        matches = []
        
        for i, donor in enumerate(donors):
            donor_blood = donor.get('bloodType')
            print(f"  Checking donor {i+1}: {donor.get('donorName')} ({donor_blood})")
            
            # Skip incompatible blood types
            if donor_blood not in compatible_types:
                print(f"    -> Skipped: blood type {donor_blood} not in {compatible_types}")
                continue
            
            # Skip hard stops
            hard_stops = check_hard_stops(donor)
            if hard_stops:
                print(f"    -> Skipped: hard stops {hard_stops}")
                continue
            
            # Get compatibility score - use rule-based by default since model may have different features
            try:
                if model is not None:
                    features = prepare_features(donor, recipient)
                    try:
                        if hasattr(model, 'predict_proba'):
                            proba = model.predict_proba(features)[0]
                            score = float(proba[1] * 100) if len(proba) > 1 else float(proba[0] * 100)
                            print(f"    -> ML Score: {score}")
                        else:
                            prediction = model.predict(features)[0]
                            score = float(prediction * 100) if prediction <= 1 else float(prediction)
                            print(f"    -> ML Score: {score}")
                    except Exception as model_error:
                        print(f"    -> Model error, using rule-based: {model_error}")
                        score = calculate_rule_based_score(donor, recipient)
                else:
                    score = calculate_rule_based_score(donor, recipient)
                    print(f"    -> Rule-based Score: {score}")
            except Exception as score_error:
                print(f"    -> Score error: {score_error}")
                score = calculate_rule_based_score(donor, recipient)
            
            warnings = check_temporary_deferrals(donor)
            
            # Determine priority
            if score >= 80:
                priority = 'high'
            elif score >= 50:
                priority = 'medium'
            else:
                priority = 'low'
            
            matches.append({
                'donorId': donor.get('id') or donor.get('donorId'),
                'donorName': donor.get('donorName', 'Anonymous'),
                'donorBloodType': donor.get('bloodType'),
                'donorLocation': donor.get('location', 'Unknown'),
                'donorContact': donor.get('contactNumber', 'N/A'),
                'donorAvailability': donor.get('availability', 'N/A'),
                'compatibilityScore': round(score, 1),
                'priority': priority,
                'isEligible': len(warnings) == 0,
                'warnings': warnings,
                'matchReasons': [f"Blood type {donor.get('bloodType')} compatible"]
            })
            print(f"    -> MATCH! Score: {score}, Priority: {priority}")
        
        # Sort by score descending
        matches.sort(key=lambda x: x['compatibilityScore'], reverse=True)
        
        print(f"Total matches found: {len(matches)}")
        
        response_data = {
            'requestId': recipient.get('id'),
            'recipientName': recipient.get('userName'),
            'bloodTypeNeeded': recipient.get('bloodType'),
            'urgency': recipient.get('urgency'),
            'matches': matches,
            'totalMatchesFound': len(matches),
            'modelUsed': model is not None,
            'timestamp': str(np.datetime64('now'))
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        import traceback
        print(f"Match error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Load model on startup
    load_model()
    
    # Start server
    print("Starting Blood Matching Model Server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
