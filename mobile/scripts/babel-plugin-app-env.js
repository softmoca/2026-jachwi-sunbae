// 번들 때 JACHWI_APP_ENV 환경 변수를 문자열로 바꿔 넣는다. 값이 없으면 undefined가 된다.
// iOS는 빌드 구성의 JACHWI_APP_ENV 빌드 설정이, Android는 buildType별 번들 작업이 값을 넘긴다.
module.exports = ({ types: t }) => ({
  name: 'jachwi-app-env',
  visitor: {
    MemberExpression(path) {
      if (!path.matchesPattern('process.env.JACHWI_APP_ENV')) return;
      const value = process.env.JACHWI_APP_ENV;
      path.replaceWith(
        value ? t.stringLiteral(value) : t.identifier('undefined'),
      );
    },
  },
});
