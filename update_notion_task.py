import requests
import json

token = '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'
headers = {
    'Authorization': f'Bearer {token}',
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
}

def update_status(page_id, status_name):
    url = f'https://api.notion.com/v1/pages/{page_id}'
    data = {
        "properties": {
            "Status": {
                "select": {
                    "name": status_name
                }
            }
        }
    }
    response = requests.patch(url, headers=headers, json=data)
    return response.status_code, response.text

# ID from our previous query: 326a6c94-88ca-81e1-acf8-f9dd9856d312
status_code, response_text = update_status('326a6c94-88ca-81e1-acf8-f9dd9856d312', 'Done')
print(f"Update status code: {status_code}")
