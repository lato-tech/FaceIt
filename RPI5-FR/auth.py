import requests
from config import Config

class AuthManager:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = Config.ERPNEXT_BASE_URL

    def authenticate(self, username, password):
        url = f"{self.base_url}/method/login"
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        data = {"usr": username, "pwd": password}
        
        try:
            response = self.session.post(url, json=data, headers=headers)
            if response.status_code == 200:
                print("Authentication successful")
                return True
            else:
                print(f"Authentication failed: {response.status_code}")
                print(response.json())
                return False
        except requests.RequestException as e:
            print(f"Error during authentication: {e}")
            return False

    def fetch_employee_data(self):
        url = f"{self.base_url}/resource/Employee?limit_page_length=100"
        try:
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                print(data)
                return data.get("data", [])
            else:
                print("Failed to fetch data from API:", response.status_code)
                return []
        except requests.RequestException as e:
            print(f"Error fetching employee data: {e}")
            return [] 