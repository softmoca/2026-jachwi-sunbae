#!/usr/bin/env bash
# Actions가 SSH로 전달하며 EC2에서 실행한다.
set -euo pipefail # 명령 오류·미정의 변수·파이프 오류를 실패로 처리한다.
# Actions가 넘긴 커밋 SHA와 실행-시도 번호를 필수 인자로 받는다.
sha=${1:?Git SHA required}
run=${2:?Run ID required}
[[ $sha =~ ^[0-9a-f]{40}$ && $run =~ ^[0-9]+-[0-9]+$ ]] || exit 1

cd /opt/jachwi-lab
# 잠금 파일을 9번 파일 디스크립터로 열고, 이전 배포 종료까지 기다린다.
exec 9>.deploy.lock
flock -x 9
trap 'rm -f app.jar.next' EXIT # 종료 시 준비 파일을 정리하고 프로세스 종료로 잠금도 해제된다.

# 새 JAR를 준비한다. root는 읽기·쓰기, jachwi-lab 그룹은 읽기만 허용한다.
install -o root -g jachwi-lab -m 0640 "/home/ec2-user/jachwi-lab-$run.jar" app.jar.next
cp -p app.jar app.jar.bak # 권한을 유지하며 직전 JAR 한 개를 백업한다.
# 준비·백업이 성공한 뒤 중지하고 같은 파일시스템에서 한 번에 교체한다.
systemctl stop jachwi-lab.service
mv -f app.jar.next app.jar
systemctl reset-failed jachwi-lab.service # 이전 실패 상태와 재시작 횟수 제한을 초기화한다.
systemctl restart jachwi-lab.service

# 약 180초 동안 재시도한다. active·health UP·실행 SHA가 모두 맞아야 성공이다.
# curl은 로컬로 직접 연결해 요청당 3초 제한, jq -e는 조건 불일치를 실패로 반환한다.
deadline=$((SECONDS + 180))
while (( SECONDS < deadline )); do
  if systemctl is-active --quiet jachwi-lab.service &&
    curl -fs --noproxy '*' --max-time 3 http://127.0.0.1:8080/actuator/health |
      jq -e '.status == "UP"' >/dev/null &&
    curl -fs --noproxy '*' --max-time 3 http://127.0.0.1:8080/actuator/info |
      jq -e --arg sha "$sha" '.build.commit == $sha' >/dev/null; then
    # 성공한 업로드만 정리한다. 실패한 업로드와 백업은 조사용으로 남긴다.
    rm -f "/home/ec2-user/jachwi-lab-$run.jar"
    echo "Deployment succeeded: $sha"
    exit 0
  fi
  sleep 3 # Spring Boot 기동을 기다렸다가 다시 확인한다.
done

# Flyway 호환성을 알 수 없으므로 자동 롤백하지 않고 Actions에 실패를 반환한다.
echo 'Health/SHA verification failed. Check: sudo journalctl -u jachwi-lab.service -n 200 --no-pager' >&2
exit 1
