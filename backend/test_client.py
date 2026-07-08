import httpx
import json
import sys

def run_test():
    url = "http://127.0.0.1:8000"
    idea = "A subscription-based platform that rents high-end mechanical keyboards to programmers."
    
    print("1. Submitting startup idea...")
    print(f"Idea: '{idea}'\n")
    
    # Create session
    try:
        resp = httpx.post(f"{url}/api/board/session", json={"idea": idea})
        resp.raise_for_status()
    except Exception as e:
        print(f"Error connecting to server at {url}. Make sure your FastAPI server is running!")
        print("Start it in another terminal with:")
        print("  .venv\\Scripts\\uvicorn app.main:app --reload --port 8000")
        sys.exit(1)
        
    session_data = resp.json()
    session_id = session_data["id"]
    print(f"Session Created! ID: {session_id}")
    print("--------------------------------------------------------------------------------")
    print("2. Connecting to live debate stream (SSE)...")
    print("--------------------------------------------------------------------------------\n")
    
    # Connect and stream SSE
    try:
        with httpx.stream("GET", f"{url}/api/board/session/{session_id}/stream", timeout=None) as r:
            r.raise_for_status()
            current_event = None
            for line in r.iter_lines():
                if not line.strip():
                    continue
                if line.startswith("event: "):
                    current_event = line[len("event: "):]
                elif line.startswith("data: ") and current_event:
                    data = json.loads(line[len("data: "):])
                    
                    if current_event == "status":
                        print(f"\n⚡ BOARD STATUS: {data['message']}")
                    elif current_event == "turn":
                        print(f"\n🗣️  {data['role']} (Round {data['round']}):")
                        print(data["content"])
                    elif current_event == "vote":
                        print(f"\n🗳️  {data['role']} cast vote: {data['vote']} (Confidence: {data['confidence']}%)")
                        print(f"Reasoning: {data['reasoning']}")
                    elif current_event == "health_score":
                        print("\n================================================================================")
                        print(f"📊 DETERMINISTIC STARTUP HEALTH SCORE: {data['overall_score']}/100")
                        print(f"Approval Ratio: {int(data['approval_ratio']*100)}% | Avg Confidence: {data['average_confidence']}%")
                        print("================================================================================\n")
                    elif current_event == "synthesis":
                        print("\n================================================================================")
                        print("📝 EXECUTIVE BOARD MEETING SUMMARY & ARTIFACTS")
                        print("================================================================================\n")
                        print("CEO Executive Summary:")
                        print(data["executive_summary"])
                        print("\nCTO System Architecture Recommendation:")
                        print(data["architecture"])
                        print("\nInvestor Identified Risk Log:")
                        for idx, risk in enumerate(data["risks"], 1):
                            print(f"  {idx}. {risk}")
                        print("\nPM 12-Week Roadmap Plan:")
                        for idx, step in enumerate(data["roadmap"], 1):
                            print(f"  {idx}. {step}")
                        print("\n--------------------------------------------------------------------------------")
    except KeyboardInterrupt:
        print("\nTest cancelled by user.")
    except Exception as e:
        print(f"\nStream error occurred: {e}")

if __name__ == "__main__":
    run_test()
