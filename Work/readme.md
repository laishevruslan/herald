Готово. Подписанный release APK собран.

Результат
APK: android/app/build/outputs/apk/release/app-release.apk (~28 MB)
Копия: ScreenTinker.apk (+ ScreenTinker.apk.version = 2.1.4)
Подписи: v1 + v2 + v3
Ключи (сохраните, в git не коммитить)
Файл
android/release-key.jks
Пароли
android/keystore.local.env
Alias
remotedisplay
Пароль один для store и key: 3alQuKBxOYGczw6EX1fjCJ4M

Повторная сборка
cd C:\fromR\ditsig\herald
Get-Content android\keystore.local.env | ForEach-Object {
  if ($_ -match "^([^=]+)=(.*)$") { Set-Item "env:$($matches[1])" $matches[2] }
}
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"
$env:ANDROID_HOME = "C:\Android\android-sdk"
cd android
.\gradlew.bat assembleRelease
Также поправил resignReleaseV1 под Windows (apksigner.bat).