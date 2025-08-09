# Splatoon Status Countdown Preset JSON Generator

Splatoon Plugin で　バフやデバフのカウントダウンを行う **Preset JSON** を簡単に生成する Web ツールです。  
  
---

## 使い方

1. `index.html` をブラウザで開く  
2. 左側フォームに必要項目を入力  
   - **PresetName**（必須）  
   - **GroupName**（必須）  
   - **ZoneId**（必須）  
   - **StatusId**（必須）  
   - **開始秒数**（必須、整数）  
   - **サブ秒しきい値**（任意）  
   - **overlayVOffset**（必須、小数1桁）  
   - **overlayFScale**（必須、小数1桁）  
3. **[JSON生成]** ボタンを押す  
4. 出力された JSON を **[コピー]** ボタンでクリップボードへ  
5. 必要に応じて右側の 16進 → 10進 変換機を使用（**StatusId**を入力する際の変換などに使用）  


