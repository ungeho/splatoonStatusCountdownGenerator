// ===== ユーティリティ =====
const $ = (q) => document.querySelector(q);
const minBox = $("#minified");
const minBytes = $("#min-bytes");
const btnGen = $("#btn-generate");
const btnCopyMin = $("#btn-copy-min");

const hexInput = $("#hex-input");
const hexResults = $("#hex-results");

function bytesLabel(s) { return `${new Blob([s]).size.toLocaleString()} bytes`; }
function toFixed1(num) { return Number(num).toFixed(1); }
function round1(num) { return Math.round(num * 10) / 10; } // 浮動小数の誤差対策

// 色（緑 > 2, 2 >= 黄 > 1, 1 >= 赤 > 0）
function overlayColorFor(val) {
    if (val > 2) return 3355508480;   // 緑
    if (val > 1) return 3355508735;   // 黄
    return 3355443455;               // 赤
}

// JSON文字列の特定フィールドを小数1桁へ
function forceFixed1OnFields(jsonStr, fieldNames) {
    const names = fieldNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const re = new RegExp(`("(?:${names})"\\s*:\\s*)(-?\\d+(?:\\.\\d+)?)(?=\\s*[,}\\]])`, "g");
    return jsonStr.replace(re, (_, head, value) => `${head}${toFixed1(value)}`);
}

// refActorBuffTimeMin/Max を常に小数1桁（.0 など）に
function ensureDotZeroForTimes(jsonStr) {
    const re = /("refActorBuffTime(?:Min|Max)"\s*:\s*)(-?\d+(?:\.\d+)?)(?=\s*[,}\]])/g;
    return jsonStr.replace(re, (_, head, value) => `${head}${toFixed1(parseFloat(value))}`);
}

// ~Lv2~ ラップ
function wrapLv2(str) { return `~Lv2~${str}`; }

// ===== カウントダウン値の生成（サブ秒しきい値対応） =====
// 返り値: [{ value: number, step: 1.0 | 0.1 }, ...] を降順で
function buildCountdownValues(startSeconds, subSecondThreshold) {
    const S = Math.floor(startSeconds);
    const T = Math.max(0, Math.floor(subSecondThreshold || 0));
    const out = [];

    if (T === 0) {
        for (let v = S; v >= 1; v--) {
            out.push({ value: v, step: 1.0 });
        }
        return out;
    }

    const cutoff = Math.min(T, S);

    // (S → cutoff+1) は 1 秒刻み
    for (let v = S; v >= Math.max(cutoff + 1, 1); v--) {
        out.push({ value: v, step: 1.0 });
    }

    // (cutoff → 0.1) は 0.1 秒刻み（cutoff も含む）
    for (let x = cutoff; round1(x) >= 0.1; x = round1(x - 0.1)) {
        out.push({ value: round1(x), step: 0.1 });
    }

    // 重複除去（保険）
    const seen = new Set();
    const uniq = [];
    for (const it of out) {
        const key = `${toFixed1(it.value)}@${it.step}`;
        if (!seen.has(key)) { seen.add(key); uniq.push(it); }
    }
    return uniq;
}

// ===== 要素生成 =====
function buildElement(item, statusId, vOffset, fScale) {
    const val = item.value;
    const step = item.step; // 1.0 or 0.1

    const isIntegerVal = Math.abs(val - Math.round(val)) < 1e-9;
    const nameText = isIntegerVal ? String(Math.round(val)) : toFixed1(val);

    const base = {
        Name: nameText,
        type: 1,
        radius: 0.0,
        Filled: false,
        fillIntensity: 0.5,
        overlayBGColor: 3355443200,
        overlayTextColor: overlayColorFor(val),
        overlayVOffset: Number(vOffset),
        overlayFScale: Number(fScale),
        thicc: 0.0,
        overlayText: nameText,
        refActorRequireBuff: true,
        refActorBuffId: [Number(statusId)],
        refActorUseBuffTime: true,
        refActorType: 1
    };

    // 表示区間は [val - step, val]。1.0 も 0.1 秒だけ表示される。
    const min = round1(val - step);
    const max = round1(val);

    if (min < 0) { // 0 未満を切り捨て
        return { ...base, refActorBuffTimeMax: max };
    }
    return { ...base, refActorBuffTimeMin: min, refActorBuffTimeMax: max };
}

function buildPreset({ presetName, groupName, zoneId, statusId, startSeconds, subSecondThreshold, overlayVOffset, overlayFScale }) {
    const values = buildCountdownValues(startSeconds, subSecondThreshold);
    const elements = values.map(v => buildElement(v, statusId, overlayVOffset, overlayFScale));
    return {
        Name: presetName,
        Group: groupName,
        ZoneLockH: [Number(zoneId)],
        ElementsL: elements
    };
}

// ===== 生成・表示 =====
function generate() {
    const presetName = $("#presetName").value.trim();
    const groupName = $("#groupName").value.trim();
    const zoneId = Number($("#zoneId").value);
    const statusId = Number($("#statusId").value);
    const startSeconds = Number($("#startSeconds").value);
    const subSecondThreshold = Number($("#subSecondThreshold").value || 0);
    const overlayVOffset = Number($("#overlayVOffset").value);
    const overlayFScale = Number($("#overlayFScale").value);

    // 必須チェック
    if (!presetName || !groupName) {
        alert("PresetName と GroupName は必須です。");
        return;
    }
    if (!Number.isFinite(zoneId)) {
        alert("ZoneId は数値で入力してください。");
        return;
    }
    if (!Number.isFinite(statusId)) {
        alert("StatusId は数値で入力してください。");
        return;
    }
    if (!Number.isFinite(startSeconds) || startSeconds < 1 || Math.floor(startSeconds) !== startSeconds) {
        alert("開始秒数は 1 以上の整数で入力してください。");
        return;
    }
    if (!Number.isFinite(overlayVOffset)) {
        alert("overlayVOffset は数値（小数1桁）で入力してください。");
        return;
    }
    if (!Number.isFinite(overlayFScale)) {
        alert("overlayFScale は数値（小数1桁）で入力してください。");
        return;
    }

    const data = buildPreset({
        presetName, groupName, zoneId, statusId,
        startSeconds, subSecondThreshold,
        overlayVOffset, overlayFScale
    });

    // 1行 JSON → 小数1桁を強制 → time を .0/… に統一 → ~Lv2~ ラップ
    let min = JSON.stringify(data);
    min = forceFixed1OnFields(min, ["radius", "overlayVOffset", "overlayFScale", "thicc"]);
    min = ensureDotZeroForTimes(min);
    min = wrapLv2(min);

    minBox.value = min;
    minBytes.textContent = bytesLabel(min);
    btnCopyMin.disabled = false;
}

// クリップボードコピー
async function copyText(el, btn) {
    el.select();
    el.setSelectionRange(0, el.value.length);
    try {
        await navigator.clipboard.writeText(el.value);
        const prev = btn.textContent;
        btn.textContent = "コピーしました ✓";
        setTimeout(() => btn.textContent = prev, 1200);
    } catch {
        alert("コピーに失敗しました。選択して手動でコピーしてください。");
    }
}

// イベント（JSON生成）
btnGen.addEventListener("click", generate);
btnCopyMin.addEventListener("click", () => copyText(minBox, btnCopyMin));

// 初期表示
generate();

/* =========================
   16進 → 10進 変換機
   ========================= */
function parseHexTokens(raw) {
    // 空白/改行/カンマ区切り対応
    return raw
        .trim()
        .replace(/,/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}

function normalizeHexToken(tok) {
    // 先頭 # / 0x / 0X を許容、16進のみ抽出
    let t = tok.trim();
    if (t.startsWith("#")) t = t.slice(1);
    if (/^0x/i.test(t)) t = t.slice(2);
    // 16進以外が混ざってたら無効
    if (!/^[0-9a-fA-F]+$/.test(t)) return null;
    return t;
}

function hexToDecimalString(hex) {
    // 32bit を越える値もあるので BigInt で扱い、符号なしの10進を出す
    try {
        const bi = BigInt("0x" + hex);
        return bi.toString(10);
    } catch {
        return null;
    }
}

function renderHexResults(list) {
    hexResults.innerHTML = "";
    if (list.length === 0) {
        const empty = document.createElement("div");
        empty.className = "bytes";
        empty.textContent = "入力した16進数を 10進に変換してここに表示します。";
        hexResults.appendChild(empty);
        return;
    }
    for (const { raw, dec } of list) {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "hex-pill";
        pill.title = "クリックでコピー";
        pill.dataset.copy = dec;

        pill.innerHTML = `<small>${raw} →</small> ${dec}`;
        pill.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(dec);
                pill.innerHTML = `<small>コピー済:</small> ${dec}`;
                setTimeout(() => pill.innerHTML = `<small>${raw} →</small> ${dec}`, 1200);
            } catch {
                // 失敗してもとくに何もしない（ブラウザ制約）
            }
        });
        hexResults.appendChild(pill);
    }
}

function handleHexInput() {
    const tokens = parseHexTokens(hexInput.value);
    const out = [];
    for (const tok of tokens) {
        const norm = normalizeHexToken(tok);
        if (!norm) continue;
        const dec = hexToDecimalString(norm);
        if (dec === null) continue;
        out.push({ raw: tok, dec });
    }
    renderHexResults(out);
}

// 入力のたびに即時変換
hexInput && hexInput.addEventListener("input", handleHexInput);
// 初期表示
handleHexInput();
