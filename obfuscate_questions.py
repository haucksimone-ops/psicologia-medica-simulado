import json
import base64
import os

raw_file = "/Users/simonehauck/.gemini/antigravity/scratch/psicologia-medica-simulado/questions_raw.json"
output_file = "/Users/simonehauck/.gemini/antigravity/scratch/psicologia-medica-simulado/questions.js"

with open(raw_file, 'r', encoding='utf-8') as f:
    questions = json.load(f)

obfuscated_questions = []
for q in questions:
    scenario_b64 = base64.b64encode(q["scenario"].encode('utf-8')).decode('utf-8')
    rubric_b64 = base64.b64encode(q["rubric"].encode('utf-8')).decode('utf-8')
    
    obfuscated_questions.append({
        "id": q["id"],
        "theme": q["theme"],
        "title": q["title"],
        "scenario": scenario_b64,
        "rubric": rubric_b64
    })

js_content = f"// Banco de Questões de Psicologia Médica I - Obfuscado em Base64\n"
js_content += f"const QUESTION_BANK = {json.dumps(obfuscated_questions, indent=2, ensure_ascii=False)};\n"

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(js_content)

print("questions.js generated successfully!")
