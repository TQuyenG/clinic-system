#!/usr/bin/env bash
# Batch add forum questions
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$SERVER_DIR"

NODE_BIN="node"

add_question() {
  local title="$1"
  local content="$2"
  local author="$3"
  local specialty="$4"
  local tags="$5"
  $NODE_BIN add-question.js --title "$title" --content "$content" --author "$author" --specialty "$specialty" --tags "$tags" --status closed
}

add_question "Đau cổ vai gáy khi làm việc máy tính" "Mỗi khi làm việc lâu, cổ và vai gáy rất mỏi. Nên tập gì và ngồi sao cho đúng?" "patient1@gmail.com" "noi-khoa" "cơ xương khớp, tư thế" 
add_question "Mất ngủ kéo dài ảnh hưởng công việc" "2 tuần gần đây mình mất ngủ, tỉnh giấc nhiều lần. Có cách nào cải thiện không?" "patient2@gmail.com" "noi-khoa" "mất ngủ, tinh thần" 
add_question "Dị ứng thời tiết nổi mẩn ngứa" "Trời trở lạnh là mình bị nổi mẩn ở tay và cổ. Có cần đi khám da liễu không?" "patient3@gmail.com" "da-lieu" "dị ứng, mẩn ngứa" 

echo "✅ Đã thêm các câu hỏi mẫu."
