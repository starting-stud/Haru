# 하루 그림일기 모바일 앱 초안

시니어 그림일기 앱의 모바일 우선 프로토타입입니다.

## 실행 방법

`index.html`을 브라우저로 열면 바로 실행됩니다.

권장 실행:

```powershell
cd C:\Users\rbeh6\haru-diary-mobile
python -m http.server 8080
```

이후 브라우저에서 `http://localhost:8080`으로 접속합니다.

## 포함 기능

- 360px대 휴대폰 화면 우선 레이아웃
- 캔버스 자유 그리기
- 펜, 색상, 지우개
- 48종 윤곽선 라이브러리
- 자주 쓰는 윤곽선 즐겨찾기 저장
- 음성으로 윤곽선 즐겨찾기 추가
- 그림일기 작성 및 localStorage 저장
- 공개/가족만/비공개 설정
- 커뮤니티, 책 만들기, 연고자 연결/알림 화면 초안
- PWA manifest 및 service worker

## 참고

원래 요청 경로인 `C:\Users\kyudo`는 현재 Cursor 실행 권한에서 쓰기 권한이 없어 생성하지 못했습니다.
권한을 열거나 Cursor를 `kyudo` 사용자로 실행하면 같은 파일 구성을 해당 경로에 바로 만들 수 있습니다.
