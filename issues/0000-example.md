<!--
severity: high|medium|low
date: 2026-02-04
author: GPT-5.2 Codex
-->

# Abstract

`read_kek` のバッファアクセスが不十分な境界チェック

# As-is

**場所:** [encrypted_metadata.rs:79-88](crates/core_storage/src/encrypted_metadata.rs#L79-L88)

```rust
if data.len() < 60 {
    return None;
}
let version = u32::from_le_bytes(data[0..4].try_into().ok()?);
let salt: [u8; 16] = data[8..24].try_into().ok()?;
let iterations = u32::from_le_bytes(data[168..172].try_into().ok()?);
let wrapped_kek_offset = if version == 3 { 32 } else { 200 };
let wrapped_kek: [u8; 24] = data[wrapped_kek_offset..wrapped_kek_offset + 24]
    .try_into()
    .ok()?;
```

# Problem

- `data.len() < 60` のチェックの後に `data[168..172]` にアクセスしている。データ長が60〜171バイトの場合、パニックする
- `version != 3` の場合、`wrapped_kek_offset = 200` となり `data[200..224]` にアクセスするが、224バイト以上のチェックがない
- `version == 3` の場合は `data[32..56]` で60バイトのチェックで足りるが、`iterations` のアクセス（168..172）は依然として不足

# To-be

境界チェックを適切に行うか、すべてのスライスアクセスを `get()` + `?` に変更する

