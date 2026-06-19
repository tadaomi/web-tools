import { persisted } from '../../lib/persisted.svelte.js';

// localStorage キーは「web-tools:<tool>:<key>:v1」の名前空間規約に従う（README参照）。
const KEY_NOTES = 'web-tools:notes:notes:v1';
const KEY_ACTIVE = 'web-tools:notes:activeId:v1';

// Note = { id, title, content, createdAt, updatedAt }
// ※ title はユーザーが手動編集した任意タイトル。空のときは本文1行目から
//    deriveTitle() で都度導出する（既存データに title は無いため、表示時にフォールバック）。
const notesStore = persisted(KEY_NOTES, []);
const activeStore = persisted(KEY_ACTIVE, null);

// 検索クエリ（セッション内の一時状態。永続化はしない）。
let searchQuery = $state('');

// 公開する状態（getter経由。再代入される $state の直接 export を避けるため）。
// コンポーネントの template / $derived から読むとリアクティブに追従する。
export const notesState = {
  get notes() {
    return notesStore.value;
  },
  get activeId() {
    return activeStore.value;
  },
  get active() {
    return notesStore.value.find((n) => n.id === activeStore.value) ?? null;
  },
  // 更新日時の降順（最近編集したものが上）
  get sorted() {
    return [...notesStore.value].sort((a, b) => b.updatedAt - a.updatedAt);
  },
  // 検索クエリ（読み書き両用。input と双方向バインドする）。
  get query() {
    return searchQuery;
  },
  set query(next) {
    searchQuery = next;
  },
  // 検索で絞り込んだ一覧（updatedAt 降順）。クエリが空なら sorted と同じ。
  // 検索対象は手動タイトル（title）＋本文（content）。大文字小文字は無視する。
  get filteredSorted() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return this.sorted;
    return this.sorted.filter((n) => {
      const haystack = `${n.title ?? ''}\n${n.content ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  },
};

// 本文1行目（最初の非空行）からタイトルを導出する。
export function deriveTitle(content) {
  const firstLine = (content ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return '無題のメモ';
  return firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine;
}

// 表示用のタイトル。手動タイトル（title）があればそれを、無ければ本文から導出する。
// 既存データ（title フィールドが無いメモ）との後方互換をここで吸収する。
export function displayTitle(note) {
  const manual = (note?.title ?? '').trim();
  if (manual) return manual;
  return deriveTitle(note?.content ?? '');
}

export function createNote() {
  const now = Date.now();
  const note = {
    id: crypto.randomUUID(),
    title: '', // 手動タイトル（未入力時は本文から導出して表示）
    content: '',
    createdAt: now,
    updatedAt: now,
  };
  notesStore.value.unshift(note); // 配列ミューテーション → 保存effectが追跡
  activeStore.value = note.id;
  return note;
}

export function deleteNote(id) {
  const index = notesStore.value.findIndex((n) => n.id === id);
  if (index === -1) return;
  notesStore.value.splice(index, 1);

  // 常に1件以上を保ち「立ち上げてすぐ書ける」状態を維持する。
  if (notesStore.value.length === 0) {
    createNote();
    return;
  }
  // 選択中のメモを消した場合は最新のメモを選択し直す。
  if (activeStore.value === id) {
    activeStore.value = notesState.sorted[0]?.id ?? null;
  }
}

export function selectNote(id) {
  activeStore.value = id;
}

// 本文編集時に更新日時を更新する（本文自体は bind:value で更新される）。
export function touchActive() {
  const note = notesState.active;
  if (note) note.updatedAt = Date.now();
}

// 起動時の初期化: 0件なら空メモを1件作成、activeId が無効なら最新を選択する。
function ensureActiveNote() {
  if (notesStore.value.length === 0) {
    createNote();
    return;
  }
  if (!notesStore.value.some((n) => n.id === activeStore.value)) {
    activeStore.value = notesState.sorted[0]?.id ?? null;
  }
}

// メモツールが読み込まれた時点で初期状態を保証する。
ensureActiveNote();
