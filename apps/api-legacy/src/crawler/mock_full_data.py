"""
실제와 유사한 전체 항공편 데이터 생성
실제 크롤링이 어려운 경우를 위한 현실적인 모의 데이터
"""
import json
from datetime import datetime
from typing import Dict, List

def generate_realistic_flight_data() -> Dict:
    """현실적인 한국 공항 항공편 데이터 생성"""
    
    data = {
        "PUS": {
            "airport": "PUS",
            "airportName": "김해국제공항",
            "crawledAt": datetime.now().isoformat(),
            "totalFlights": 0,
            "flights": []
        },
        "ICN": {
            "airport": "ICN", 
            "airportName": "인천국제공항",
            "crawledAt": datetime.now().isoformat(),
            "totalFlights": 0,
            "flights": []
        },
        "GMP": {
            "airport": "GMP",
            "airportName": "김포국제공항", 
            "crawledAt": datetime.now().isoformat(),
            "totalFlights": 0,
            "flights": []
        },
        "CJU": {
            "airport": "CJU",
            "airportName": "제주국제공항",
            "crawledAt": datetime.now().isoformat(),
            "totalFlights": 0,
            "flights": []
        }
    }
    
    # PUS (김해) 출발 항공편 - 실제 운항 노선 기반
    pus_flights = [
        # 일본 노선
        {"airline": "에어부산", "flightNo": "BX164", "destination": "NRT", "departureTime": "07:35", "arrivalTime": "10:05"},
        {"airline": "에어부산", "flightNo": "BX112", "destination": "NRT", "departureTime": "14:25", "arrivalTime": "16:55"},
        {"airline": "진에어", "flightNo": "LJ201", "destination": "NRT", "departureTime": "08:20", "arrivalTime": "10:50"},
        {"airline": "제주항공", "flightNo": "7C1151", "destination": "NRT", "departureTime": "10:30", "arrivalTime": "13:00"},
        {"airline": "이스타항공", "flightNo": "ZE605", "destination": "NRT", "departureTime": "08:50", "arrivalTime": "11:20"},
        {"airline": "티웨이항공", "flightNo": "TW251", "destination": "NRT", "departureTime": "13:40", "arrivalTime": "16:10"},
        
        {"airline": "에어부산", "flightNo": "BX122", "destination": "KIX", "departureTime": "07:00", "arrivalTime": "08:50"},
        {"airline": "에어부산", "flightNo": "BX124", "destination": "KIX", "departureTime": "13:15", "arrivalTime": "15:05"},
        {"airline": "제주항공", "flightNo": "7C1301", "destination": "KIX", "departureTime": "08:45", "arrivalTime": "10:35"},
        {"airline": "진에어", "flightNo": "LJ241", "destination": "KIX", "departureTime": "11:20", "arrivalTime": "13:10"},
        {"airline": "티웨이항공", "flightNo": "TW301", "destination": "KIX", "departureTime": "15:30", "arrivalTime": "17:20"},
        {"airline": "이스타항공", "flightNo": "ZE641", "destination": "KIX", "departureTime": "09:40", "arrivalTime": "11:30"},
        
        {"airline": "대한항공", "flightNo": "KE2711", "destination": "HND", "departureTime": "09:00", "arrivalTime": "11:20"},
        {"airline": "일본항공", "flightNo": "JL958", "destination": "HND", "departureTime": "13:45", "arrivalTime": "16:05"},
        
        {"airline": "에어부산", "flightNo": "BX186", "destination": "NGO", "departureTime": "08:30", "arrivalTime": "10:10"},
        {"airline": "티웨이항공", "flightNo": "TW281", "destination": "FUK", "departureTime": "07:55", "arrivalTime": "09:15"},
        {"airline": "진에어", "flightNo": "LJ261", "destination": "FUK", "departureTime": "14:20", "arrivalTime": "15:40"},
        
        # 중국 노선
        {"airline": "중국남방항공", "flightNo": "CZ3072", "destination": "PEK", "departureTime": "09:30", "arrivalTime": "12:20"},
        {"airline": "에어부산", "flightNo": "BX316", "destination": "PVG", "departureTime": "10:15", "arrivalTime": "11:45"},
        {"airline": "중국동방항공", "flightNo": "MU5054", "destination": "PVG", "departureTime": "15:40", "arrivalTime": "17:10"},
        {"airline": "춘추항공", "flightNo": "9C8854", "destination": "PVG", "departureTime": "18:20", "arrivalTime": "19:50"},
        {"airline": "심천항공", "flightNo": "ZH9084", "destination": "SZX", "departureTime": "11:30", "arrivalTime": "14:40"},
        {"airline": "중국남방항공", "flightNo": "CZ3048", "destination": "CAN", "departureTime": "13:50", "arrivalTime": "16:40"},
        
        # 동남아 노선
        {"airline": "에어부산", "flightNo": "BX746", "destination": "BKK", "departureTime": "00:50", "arrivalTime": "04:45"},
        {"airline": "티웨이항공", "flightNo": "TW101", "destination": "BKK", "departureTime": "19:30", "arrivalTime": "23:25"},
        {"airline": "타이항공", "flightNo": "TG675", "destination": "BKK", "departureTime": "12:10", "arrivalTime": "16:05"},
        
        {"airline": "베트남항공", "flightNo": "VN423", "destination": "SGN", "departureTime": "10:40", "arrivalTime": "14:10"},
        {"airline": "비엣젯", "flightNo": "VJ963", "destination": "SGN", "departureTime": "22:40", "arrivalTime": "02:10+1"},
        {"airline": "에어부산", "flightNo": "BX736", "destination": "DAD", "departureTime": "08:20", "arrivalTime": "11:50"},
        {"airline": "진에어", "flightNo": "LJ063", "destination": "DAD", "departureTime": "20:15", "arrivalTime": "23:45"},
        
        {"airline": "필리핀항공", "flightNo": "PR433", "destination": "MNL", "departureTime": "07:30", "arrivalTime": "11:40"},
        {"airline": "에어부산", "flightNo": "BX716", "destination": "CEB", "departureTime": "01:20", "arrivalTime": "05:30"},
        
        # 대만/홍콩 노선
        {"airline": "에바항공", "flightNo": "BR169", "destination": "TPE", "departureTime": "12:00", "arrivalTime": "13:35"},
        {"airline": "티웨이항공", "flightNo": "TW661", "destination": "TPE", "departureTime": "16:20", "arrivalTime": "17:55"},
        {"airline": "에어부산", "flightNo": "BX392", "destination": "KHH", "departureTime": "09:50", "arrivalTime": "11:30"},
        
        {"airline": "홍콩익스프레스", "flightNo": "UO825", "destination": "HKG", "departureTime": "11:00", "arrivalTime": "13:50"},
        {"airline": "에어부산", "flightNo": "BX346", "destination": "HKG", "departureTime": "14:30", "arrivalTime": "17:20"},
        
        # 기타 국제선
        {"airline": "에어부산", "flightNo": "BX796", "destination": "ULN", "departureTime": "08:40", "arrivalTime": "13:10"},
        {"airline": "에어부산", "flightNo": "BX176", "destination": "VTE", "departureTime": "19:00", "arrivalTime": "22:20"},
        
        # 국내선
        {"airline": "대한항공", "flightNo": "KE1401", "destination": "CJU", "departureTime": "07:00", "arrivalTime": "08:00"},
        {"airline": "대한항공", "flightNo": "KE1403", "destination": "CJU", "departureTime": "08:20", "arrivalTime": "09:20"},
        {"airline": "아시아나항공", "flightNo": "OZ8111", "destination": "CJU", "departureTime": "07:30", "arrivalTime": "08:30"},
        {"airline": "아시아나항공", "flightNo": "OZ8113", "destination": "CJU", "departureTime": "09:00", "arrivalTime": "10:00"},
        {"airline": "제주항공", "flightNo": "7C511", "destination": "CJU", "departureTime": "06:50", "arrivalTime": "07:50"},
        {"airline": "진에어", "flightNo": "LJ561", "destination": "CJU", "departureTime": "10:30", "arrivalTime": "11:30"},
        {"airline": "에어부산", "flightNo": "BX8101", "destination": "CJU", "departureTime": "11:45", "arrivalTime": "12:45"},
        {"airline": "티웨이항공", "flightNo": "TW801", "destination": "CJU", "departureTime": "13:00", "arrivalTime": "14:00"},
        
        {"airline": "대한항공", "flightNo": "KE1621", "destination": "GMP", "departureTime": "07:40", "arrivalTime": "08:40"},
        {"airline": "아시아나항공", "flightNo": "OZ8831", "destination": "GMP", "departureTime": "08:10", "arrivalTime": "09:10"},
        {"airline": "에어서울", "flightNo": "RS911", "destination": "ICN", "departureTime": "09:20", "arrivalTime": "10:20"},
    ]
    
    # ICN (인천) 출발 항공편 - 주요 국제선
    icn_flights = [
        # 미주 노선
        {"airline": "대한항공", "flightNo": "KE001", "destination": "LAX", "departureTime": "10:00", "arrivalTime": "05:10"},
        {"airline": "대한항공", "flightNo": "KE011", "destination": "LAX", "departureTime": "13:00", "arrivalTime": "08:10"},
        {"airline": "아시아나항공", "flightNo": "OZ202", "destination": "LAX", "departureTime": "12:20", "arrivalTime": "07:00"},
        {"airline": "유나이티드항공", "flightNo": "UA892", "destination": "SFO", "departureTime": "11:05", "arrivalTime": "05:50"},
        {"airline": "대한항공", "flightNo": "KE023", "destination": "SFO", "departureTime": "14:30", "arrivalTime": "09:15"},
        {"airline": "델타항공", "flightNo": "DL158", "destination": "SEA", "departureTime": "17:45", "arrivalTime": "11:55"},
        {"airline": "대한항공", "flightNo": "KE081", "destination": "JFK", "departureTime": "09:50", "arrivalTime": "10:30"},
        {"airline": "아시아나항공", "flightNo": "OZ222", "destination": "JFK", "departureTime": "13:40", "arrivalTime": "14:20"},
        
        # 유럽 노선
        {"airline": "대한항공", "flightNo": "KE901", "destination": "LHR", "departureTime": "11:45", "arrivalTime": "15:40"},
        {"airline": "아시아나항공", "flightNo": "OZ521", "destination": "LHR", "departureTime": "12:50", "arrivalTime": "16:45"},
        {"airline": "대한항공", "flightNo": "KE909", "destination": "CDG", "departureTime": "13:35", "arrivalTime": "18:30"},
        {"airline": "에어프랑스", "flightNo": "AF267", "destination": "CDG", "departureTime": "09:00", "arrivalTime": "13:55"},
        {"airline": "루프트한자", "flightNo": "LH713", "destination": "FRA", "departureTime": "11:00", "arrivalTime": "15:30"},
        {"airline": "아시아나항공", "flightNo": "OZ541", "destination": "FRA", "departureTime": "19:10", "arrivalTime": "23:40"},
        
        # 일본 노선
        {"airline": "대한항공", "flightNo": "KE703", "destination": "NRT", "departureTime": "09:25", "arrivalTime": "11:45"},
        {"airline": "대한항공", "flightNo": "KE705", "destination": "NRT", "departureTime": "14:05", "arrivalTime": "16:25"},
        {"airline": "아시아나항공", "flightNo": "OZ102", "destination": "NRT", "departureTime": "09:00", "arrivalTime": "11:20"},
        {"airline": "일본항공", "flightNo": "JL952", "destination": "NRT", "departureTime": "10:00", "arrivalTime": "12:20"},
        {"airline": "전일본공수", "flightNo": "NH862", "destination": "NRT", "departureTime": "17:30", "arrivalTime": "19:50"},
        {"airline": "대한항공", "flightNo": "KE721", "destination": "KIX", "departureTime": "08:30", "arrivalTime": "10:20"},
        {"airline": "아시아나항공", "flightNo": "OZ112", "destination": "KIX", "departureTime": "08:40", "arrivalTime": "10:30"},
        {"airline": "피치항공", "flightNo": "MM802", "destination": "KIX", "departureTime": "20:25", "arrivalTime": "22:15"},
        
        # 중국 노선
        {"airline": "중국국제항공", "flightNo": "CA124", "destination": "PEK", "departureTime": "08:00", "arrivalTime": "09:20"},
        {"airline": "대한항공", "flightNo": "KE851", "destination": "PEK", "departureTime": "09:30", "arrivalTime": "10:50"},
        {"airline": "아시아나항공", "flightNo": "OZ331", "destination": "PEK", "departureTime": "10:10", "arrivalTime": "11:30"},
        {"airline": "중국동방항공", "flightNo": "MU272", "destination": "PVG", "departureTime": "08:55", "arrivalTime": "10:10"},
        {"airline": "대한항공", "flightNo": "KE893", "destination": "PVG", "departureTime": "13:00", "arrivalTime": "14:15"},
        {"airline": "중국남방항공", "flightNo": "CZ370", "destination": "CAN", "departureTime": "14:25", "arrivalTime": "17:30"},
        
        # 동남아 노선
        {"airline": "대한항공", "flightNo": "KE651", "destination": "BKK", "departureTime": "18:05", "arrivalTime": "21:45"},
        {"airline": "아시아나항공", "flightNo": "OZ741", "destination": "BKK", "departureTime": "19:30", "arrivalTime": "23:10"},
        {"airline": "타이항공", "flightNo": "TG657", "destination": "BKK", "departureTime": "10:20", "arrivalTime": "14:10"},
        {"airline": "싱가포르항공", "flightNo": "SQ601", "destination": "SIN", "departureTime": "09:00", "arrivalTime": "14:40"},
        {"airline": "대한항공", "flightNo": "KE643", "destination": "SIN", "departureTime": "23:55", "arrivalTime": "05:35+1"},
        {"airline": "베트남항공", "flightNo": "VN417", "destination": "HAN", "departureTime": "10:05", "arrivalTime": "13:00"},
        {"airline": "대한항공", "flightNo": "KE679", "destination": "HAN", "departureTime": "19:25", "arrivalTime": "22:20"},
        
        # 국내선
        {"airline": "대한항공", "flightNo": "KE1261", "destination": "CJU", "departureTime": "07:00", "arrivalTime": "08:10"},
        {"airline": "대한항공", "flightNo": "KE1263", "destination": "CJU", "departureTime": "08:00", "arrivalTime": "09:10"},
        {"airline": "아시아나항공", "flightNo": "OZ8921", "destination": "CJU", "departureTime": "07:30", "arrivalTime": "08:40"},
        {"airline": "제주항공", "flightNo": "7C111", "destination": "CJU", "departureTime": "06:30", "arrivalTime": "07:40"},
        {"airline": "진에어", "flightNo": "LJ301", "destination": "CJU", "departureTime": "09:00", "arrivalTime": "10:10"},
        {"airline": "대한항공", "flightNo": "KE1951", "destination": "PUS", "departureTime": "07:30", "arrivalTime": "08:30"},
        {"airline": "아시아나항공", "flightNo": "OZ8801", "destination": "PUS", "departureTime": "08:20", "arrivalTime": "09:20"},
    ]
    
    # GMP (김포) 출발 항공편
    gmp_flights = [
        # 국제선
        {"airline": "대한항공", "flightNo": "KE2741", "destination": "KIX", "departureTime": "08:30", "arrivalTime": "10:20"},
        {"airline": "전일본공수", "flightNo": "NH868", "destination": "HND", "departureTime": "08:00", "arrivalTime": "10:15"},
        {"airline": "일본항공", "flightNo": "JL092", "destination": "HND", "departureTime": "09:20", "arrivalTime": "11:35"},
        {"airline": "대한항공", "flightNo": "KE2711", "destination": "HND", "departureTime": "19:40", "arrivalTime": "21:55"},
        {"airline": "중국동방항공", "flightNo": "MU5042", "destination": "SHA", "departureTime": "12:55", "arrivalTime": "14:10"},
        {"airline": "대한항공", "flightNo": "KE2811", "destination": "SHA", "departureTime": "09:10", "arrivalTime": "10:50"},
        {"airline": "중국국제항공", "flightNo": "CA140", "destination": "PEK", "departureTime": "14:05", "arrivalTime": "15:35"},
        
        # 국내선
        {"airline": "대한항공", "flightNo": "KE1201", "destination": "CJU", "departureTime": "07:00", "arrivalTime": "08:10"},
        {"airline": "대한항공", "flightNo": "KE1203", "destination": "CJU", "departureTime": "07:30", "arrivalTime": "08:40"},
        {"airline": "아시아나항공", "flightNo": "OZ8901", "destination": "CJU", "departureTime": "07:05", "arrivalTime": "08:15"},
        {"airline": "제주항공", "flightNo": "7C101", "destination": "CJU", "departureTime": "06:50", "arrivalTime": "08:00"},
        {"airline": "대한항공", "flightNo": "KE1401", "destination": "PUS", "departureTime": "07:20", "arrivalTime": "08:20"},
        {"airline": "아시아나항공", "flightNo": "OZ8701", "destination": "PUS", "departureTime": "08:00", "arrivalTime": "09:00"},
    ]
    
    # CJU (제주) 출발 항공편
    cju_flights = [
        # 국제선
        {"airline": "티웨이항공", "flightNo": "TW301", "destination": "KIX", "departureTime": "10:30", "arrivalTime": "12:30"},
        {"airline": "진에어", "flightNo": "LJ711", "destination": "NRT", "departureTime": "11:00", "arrivalTime": "13:40"},
        
        # 국내선 (주요 도시)
        {"airline": "대한항공", "flightNo": "KE1202", "destination": "GMP", "departureTime": "08:50", "arrivalTime": "10:00"},
        {"airline": "아시아나항공", "flightNo": "OZ8902", "destination": "GMP", "departureTime": "08:55", "arrivalTime": "10:05"},
        {"airline": "제주항공", "flightNo": "7C102", "destination": "GMP", "departureTime": "09:30", "arrivalTime": "10:40"},
        {"airline": "대한항공", "flightNo": "KE1262", "destination": "ICN", "departureTime": "09:10", "arrivalTime": "10:20"},
        {"airline": "아시아나항공", "flightNo": "OZ8922", "destination": "ICN", "departureTime": "09:40", "arrivalTime": "10:50"},
        {"airline": "대한항공", "flightNo": "KE1402", "destination": "PUS", "departureTime": "10:30", "arrivalTime": "11:20"},
        {"airline": "아시아나항공", "flightNo": "OZ8112", "destination": "PUS", "departureTime": "10:00", "arrivalTime": "10:50"},
        {"airline": "에어부산", "flightNo": "BX8102", "destination": "PUS", "departureTime": "13:00", "arrivalTime": "13:50"},
        {"airline": "대한항공", "flightNo": "KE1902", "destination": "TAE", "departureTime": "11:30", "arrivalTime": "12:20"},
        {"airline": "아시아나항공", "flightNo": "OZ8122", "destination": "TAE", "departureTime": "12:00", "arrivalTime": "12:50"},
    ]
    
    # 운항 요일 설정 (대부분 매일 운항, 일부는 특정 요일만)
    def set_operation_days(flight, daily=True):
        if daily:
            flight["days"] = {"mon": True, "tue": True, "wed": True, "thu": True, "fri": True, "sat": True, "sun": True}
        else:
            # 일부 노선은 특정 요일만 운항
            import random
            days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
            flight["days"] = {day: random.choice([True, False]) for day in days}
        return flight
    
    # 모든 항공편에 운항 요일 추가
    for flight in pus_flights:
        # 국제선 장거리는 일부 요일만 운항할 수 있음
        if flight["destination"] in ["LAX", "JFK", "LHR", "CDG", "FRA", "ULN", "VTE"]:
            set_operation_days(flight, daily=False)
        else:
            set_operation_days(flight, daily=True)
    
    for flight in icn_flights:
        if flight["destination"] in ["LAX", "JFK", "SEA", "SFO", "LHR", "CDG", "FRA"]:
            set_operation_days(flight, daily=False)
        else:
            set_operation_days(flight, daily=True)
    
    for flight in gmp_flights + cju_flights:
        set_operation_days(flight, daily=True)
    
    # 데이터 저장
    data["PUS"]["flights"] = pus_flights
    data["PUS"]["totalFlights"] = len(pus_flights)
    
    data["ICN"]["flights"] = icn_flights
    data["ICN"]["totalFlights"] = len(icn_flights)
    
    data["GMP"]["flights"] = gmp_flights
    data["GMP"]["totalFlights"] = len(gmp_flights)
    
    data["CJU"]["flights"] = cju_flights
    data["CJU"]["totalFlights"] = len(cju_flights)
    
    return data

if __name__ == "__main__":
    # 데이터 생성
    flight_data = generate_realistic_flight_data()
    
    # 디렉토리 생성
    import os
    os.makedirs("flight_data", exist_ok=True)
    
    # 파일로 저장
    with open("flight_data/korean_flight_schedules.json", "w", encoding="utf-8") as f:
        json.dump(flight_data, f, ensure_ascii=False, indent=2)
    
    # 통계 출력
    print("Generated flight data:")
    for airport, data in flight_data.items():
        print(f"  {airport}: {data['totalFlights']} flights")
        
        # 도착지별 통계
        destinations = {}
        for flight in data['flights']:
            dest = flight['destination']
            if dest in destinations:
                destinations[dest] += 1
            else:
                destinations[dest] = 1
        
        print(f"    Destinations: {', '.join(f'{d}({c})' for d, c in sorted(destinations.items()))}")
    
    print(f"\nTotal: {sum(d['totalFlights'] for d in flight_data.values())} flights")