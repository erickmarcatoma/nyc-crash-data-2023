import json
from urllib.parse import quote
from urllib.request import Request, urlopen
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

NYC_OPEN_DATA_ENDPOINT = "https://data.cityofnewyork.us/api/v3/views/h9gi-nx95/query.json"

def fetch_live_nyc_crash_data(borough=None):
    """Queries NYC Open Data SODA API for 2023 collision factor aggregates filtered by borough."""
    
    where_clauses = [
        "crash_date >= '2023-01-01T00:00:00'",
        "crash_date <= '2023-12-31T23:59:59'",
        "contributing_factor_vehicle_1 IS NOT NULL",
        "contributing_factor_vehicle_1 != 'Unspecified'"
    ]
    
    # Filter by specific borough if provided and not set to "ALL"
    if borough and borough.upper() != "ALL":
        where_clauses.append(f"borough = '{borough.upper()}'")
        
    where_statement = " AND ".join(where_clauses)

    soql_query = (
        f"SELECT contributing_factor_vehicle_1, COUNT(*) as count "
        f"WHERE {where_statement} "
        f"GROUP BY contributing_factor_vehicle_1 "
        f"ORDER BY count DESC "
        f"LIMIT 10"
    )

    url = f"{NYC_OPEN_DATA_ENDPOINT}?query={quote(soql_query)}"

    req = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "NYC-Crash-Data-App/1.0"
        }
    )

    with urlopen(req, timeout=10) as response:
        if response.status == 200:
            raw_data = json.loads(response.read().decode('utf-8'))
            return parse_socrata_response(raw_data)
        raise Exception(f"NYC Open Data returned HTTP {response.status}")

def parse_socrata_response(data):
    """Formats Socrata API response into structured chart format."""
    results = []
    rows = data if isinstance(data, list) else data.get('rows', [])

    for index, row in enumerate(rows):
        if isinstance(row, dict):
            factor = row.get('contributing_factor_vehicle_1', 'Unknown').title()
            count = int(row.get('count', 0))
        elif isinstance(row, list) and len(row) >= 2:
            factor = str(row[0]).title()
            count = int(row[1])
        else:
            continue

        # Highlight the #1 ranking cause in red
        results.append({
            "factor": factor,
            "count": count,
            "highlight": index == 0
        })

    return results

@app.route('/api/factors', methods=['GET'])
def get_contributing_factors():
    selected_borough = request.args.get('borough', default='ALL', type=str)
    
    try:
        live_data = fetch_live_nyc_crash_data(selected_borough)
        if live_data:
            return jsonify(live_data)
    except Exception as err:
        print(f"Fallback activated due to API error: {err}")

    # Fallback array if NYC API is offline or slow
    fallback_factors = [
        {"factor": "Driver Inattention/Distraction", "count": 24111, "highlight": True},
        {"factor": "Failure to Yield Right-Of-Way", "count": 6598, "highlight": False},
        {"factor": "Following Too Closely", "count": 6116, "highlight": False},
        {"factor": "Unsafe Speed", "count": 3796, "highlight": False},
        {"factor": "Alcohol Involvement", "count": 1762, "highlight": False},
        {"factor": "Cell Phone (Hand-Held)", "count": 39, "highlight": False}
    ]
    return jsonify(fallback_factors)

# Serverless entry point exports
application = app
handler = app

if __name__ == "__main__":
    app.run(port=5000, debug=True)