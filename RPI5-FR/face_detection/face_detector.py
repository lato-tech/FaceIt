# face_detection/face_detector.py
# using the Haar Cascades for performance
# will see if FR lib give better performance or not

import cv2
import os
import numpy as np
import face_recognition
from datetime import datetime
import time

class FaceDetector:

    def __init__(self, known_face_encodings=None, known_face_names=None, recognition_tolerance=0.6):
        base_path = "./face_detection/"
        
        # Initialize Haar cascades
        self.frontal_cascade = cv2.CascadeClassifier(os.path.join(base_path, "haarcascade_frontalface_default.xml"))
        self.profile_cascade = cv2.CascadeClassifier(os.path.join(base_path, "haarcascade_profileface.xml"))
        self.alt_cascade = cv2.CascadeClassifier(os.path.join(base_path, "haarcascade_frontalface_alt.xml"))
        self.alt2_cascade = cv2.CascadeClassifier(os.path.join(base_path, "haarcascade_frontalface_alt2.xml"))
        
        # Face recognition data
        self.known_face_encodings = known_face_encodings or []
        self.known_face_names = known_face_names or []
        self.recognition_tolerance = recognition_tolerance
        # Use distance-based threshold (face_recognition default is 0.6)
        self.min_confidence_threshold = 0.4  # 1 - 0.6
        self.last_recognized = {'name': None, 'ts': 0.0}

    def update_known_faces(self, known_face_encodings, known_face_names):
        """Update the known faces for recognition"""
        self.known_face_encodings = known_face_encodings
        self.known_face_names = known_face_names
        print(f"📊 Updated face detector with {len(known_face_names)} known faces")

    # Return the ROI of the face
    def detect_faces(self, frame):
        """Detect faces using Haar cascades (no recognition)"""
        # Handle None or empty frames
        if frame is None or frame.size == 0:
            return []
        
        # Check if frame is already grayscale (1 channel) or color (3 channels)
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            # Color image - convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        elif len(frame.shape) == 2:
            # Already grayscale - use as is
            gray = frame
        else:
            # Handle other cases (like RGBA) by converting to BGR first
            if len(frame.shape) == 3 and frame.shape[2] == 4:
                frame = cv2.cvtColor(frame, cv2.COLOR_RGBA2BGR)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        ## now supporting various face angles
        ## distance needs to be tested // TODO //
        frontal_faces = self.frontal_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        profile_faces = self.profile_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        alt_faces = self.alt_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
        alt2_faces = self.alt2_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        # Convert numpy arrays to lists and combine all detected faces
        all_faces = []
        if len(frontal_faces) > 0:
            all_faces.extend(frontal_faces.tolist())
        if len(profile_faces) > 0:
            all_faces.extend(profile_faces.tolist())
        if len(alt_faces) > 0:
            all_faces.extend(alt_faces.tolist())
        if len(alt2_faces) > 0:
            all_faces.extend(alt2_faces.tolist())

        print(f"Frontal faces: {len(frontal_faces)}")
        print(f"Total faces detected: {len(all_faces)}")
        return all_faces

    def detect_and_recognize_faces(self, frame):
        """Detect faces and identify them with names and confidence scores"""
        if frame is None or frame.size == 0:
            return []
        
        try:
            # Validate frame format
            if len(frame.shape) != 3 or frame.shape[2] != 3:
                print(f"⚠️  Invalid frame format: shape={frame.shape}")
                return []
            
            # Downscale for faster recognition on RPi, then scale results back
            h, w = frame.shape[:2]
            target_width = 640
            scale = 1.0
            resized = frame
            if w > target_width:
                scale = target_width / float(w)
                new_h = max(1, int(h * scale))
                resized = cv2.resize(frame, (target_width, new_h), interpolation=cv2.INTER_AREA)
            
            # Convert BGR to RGB for face_recognition library
            rgb_image = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
            
            # Find faces using face_recognition library (more accurate than Haar cascades)
            face_locations = face_recognition.face_locations(rgb_image)
            face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
            
            # Get landmarks to filter for frontal faces only (reject profile/side view)
            landmarks_list = []
            try:
                landmarks_list = face_recognition.face_landmarks(rgb_image, face_locations, model='large')
            except Exception:
                pass  # If landmarks fail, process all faces (fail open)
            
            results = []
            for i, (face_location, face_encoding) in enumerate(zip(face_locations, face_encodings)):
                # Filter: only accept faces facing the camera (reject side/profile view)
                top, right, bottom, left = face_location
                if i < len(landmarks_list):
                    try:
                        landmarks = landmarks_list[i]
                        left_eye = landmarks.get('left_eye', [])
                        right_eye = landmarks.get('right_eye', [])
                        nose_tip = landmarks.get('nose_tip', [])
                        if left_eye and right_eye and nose_tip:
                            left_eye_center = np.mean(np.array(left_eye), axis=0)
                            right_eye_center = np.mean(np.array(right_eye), axis=0)
                            nose_center = np.mean(np.array(nose_tip), axis=0)
                            face_center_x = (left + right) / 2.0
                            face_w = max(1.0, right - left)
                            nose_offset_x = (nose_center[0] - face_center_x) / face_w
                            # Reject faces turned too much (profile/side view). 0.2 = ~25°; stricter = 0.15
                            if abs(nose_offset_x) > 0.2:
                                continue  # Skip this face - not facing camera
                    except Exception:
                        pass  # On error, allow face (fail open)
                # Calculate distances to all known faces
                if self.known_face_encodings:
                    face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                    min_distance_index = np.argmin(face_distances)
                    min_distance = face_distances[min_distance_index]
                    
                    # Calculate confidence (distance-based)
                    confidence = 1.0 - min_distance
                    
                    # Require clear winner: best match within tolerance AND clearly better than second-best (reduces false positives).
                    within_tolerance = min_distance <= self.recognition_tolerance
                    if len(face_distances) > 1:
                        sorted_indices = np.argsort(face_distances)
                        second_min_distance = float(face_distances[sorted_indices[1]])
                        margin = second_min_distance - min_distance
                        clear_winner = margin >= 0.06  # require gap to avoid confusing similar-looking faces
                    else:
                        margin = 0.0
                        clear_winner = True  # only one known face: no second-best to compare
                    if within_tolerance and clear_winner:
                        name = self.known_face_names[min_distance_index]
                        print(f"🔍 Face {i+1}: {name} (confidence: {confidence:.3f}, distance: {min_distance:.3f}, margin: {margin:.3f})")
                    else:
                        name = "Unknown"
                        reason = "margin" if within_tolerance and not clear_winner else "tolerance"
                        print(f"🔍 Face {i+1}: Unknown (best distance: {min_distance:.3f}, tolerance: {self.recognition_tolerance}, {reason})")
                else:
                    name = "Unknown"
                    confidence = 0.0
                    print(f"🔍 Face {i+1}: Unknown (no known faces loaded)")
                
                # Get face location for bounding box (scale back to original)
                top, right, bottom, left = face_location
                if scale != 1.0:
                    inv_scale = 1.0 / scale
                    top = int(top * inv_scale)
                    right = int(right * inv_scale)
                    bottom = int(bottom * inv_scale)
                    left = int(left * inv_scale)
                
                if name != "Unknown":
                    self.last_recognized = {'name': name, 'ts': time.time()}
                
                results.append({
                    'name': name,
                    'confidence': round(confidence, 3),
                    'timestamp': datetime.now().isoformat(),
                    'location': {
                        'top': top,
                        'right': right,
                        'bottom': bottom,
                        'left': left
                    },
                    'face_id': i  # Unique identifier for this face in the frame
                })
            
            if results:
                recognized_names = [r['name'] for r in results if r['name'] != 'Unknown']
                if recognized_names:
                    print(f"👥 Recognized: {', '.join(recognized_names)}")
                else:
                    print(f"👤 Detected {len(results)} unknown face(s)")
            
            return results
            
        except Exception as e:
            print(f"❌ Error in face detection and recognition: {e}")
            return []

    def detect_faces_with_haar_and_recognize(self, frame):
        """Use Haar cascades for detection, then face_recognition for identification"""
        if frame is None or frame.size == 0:
            return []
        
        try:
            # First detect faces using Haar cascades (faster)
            face_locations_haar = self.detect_faces(frame)
            
            if not face_locations_haar:
                return []
            
            # Convert BGR to RGB for face_recognition library
            rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            results = []
            for i, (x, y, w, h) in enumerate(face_locations_haar):
                # Convert Haar format (x,y,w,h) to face_recognition format (top,right,bottom,left)
                top, right, bottom, left = y, x + w, y + h, x
                
                # Extract face region
                face_image = rgb_image[top:bottom, left:right]
                
                # Get face encoding
                face_encodings = face_recognition.face_encodings(face_image)
                
                if face_encodings:
                    face_encoding = face_encodings[0]
                    
                    # Compare with known faces
                    matches = face_recognition.compare_faces(
                        self.known_face_encodings, 
                        face_encoding, 
                        tolerance=self.recognition_tolerance
                    )
                    
                    name = "Unknown"
                    confidence = 0.0
                    
                    if True in matches:
                        first_match_index = matches.index(True)
                        name = self.known_face_names[first_match_index]
                        
                        # Calculate confidence
                        face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                        confidence = 1.0 - face_distances[first_match_index]
                    
                    results.append({
                        'name': name,
                        'confidence': round(confidence, 3),
                        'timestamp': datetime.now().isoformat(),
                        'location': {
                            'top': top,
                            'right': right,
                            'bottom': bottom,
                            'left': left
                        },
                        'face_id': i
                    })
            
            if results:
                recognized_names = [r['name'] for r in results if r['name'] != 'Unknown']
                if recognized_names:
                    print(f"👥 Recognized: {', '.join(recognized_names)}")
                else:
                    print(f"👤 Detected {len(results)} unknown face(s)")
            
            return results
            
        except Exception as e:
            print(f"❌ Error in Haar + recognition: {e}")
            return []
