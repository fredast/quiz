import csv
import json
import sys

questions = []
themes = []
with open(sys.argv[1], newline='') as csvfile:
  rows = [row for row in csv.reader(csvfile)]

question_id = 0

for row in rows[1:]:
  if len(row[0]) == 0:
    continue 

  question_id += 1

  theme_name = row[0]
  if themes and themes[-1]["themeName"] == theme_name:
    themes[-1]["lastQuestionId"] = question_id
  else:
    themes.append({
      "themeName": theme_name,
      "image": row[9],
      "firstQuestionId": question_id,
      "lastQuestionId": question_id
    })

  questions.append({
    "id": question_id,
    "answer": row[6],
    "content": {
      "text": row[1],
      "image": row[8],
      "timeout": int(row[7]),
      "answers": [
        {
          "id": "1",
          "text": row[2]
        },
        {
          "id": "2",
          "text": row[3]
        },
        {
          "id": "3",
          "text": row[4]
        },
        {
          "id": "4",
          "text": row[5]
        }
      ]
    }
  })

content = {
  "themes": themes,
  "questions": questions
}

with open(sys.argv[2], 'w') as f:
  f.write(json.dumps(content, ensure_ascii=False).replace("\\n", "<br/>"))