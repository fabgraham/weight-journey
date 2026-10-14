# Expo Router Example

Use [`expo-router`](https://docs.expo.dev/router/introduction/) to build native navigation using files in the `app/` directory.

## Launch your own

[![Launch with Expo](https://github.com/expo/examples/blob/master/.gh-assets/launch.svg?raw=true)](https://launch.expo.dev/?github=https://github.com/expo/examples/tree/master/with-router)

## 🚀 How to use

```sh
npx create-expo-app -e with-router
```

## Deploy

Deploy on all platforms with Expo Application Services (EAS).

- Deploy the website: `npx eas-cli deploy` — [Learn more](https://docs.expo.dev/eas/hosting/get-started/)
- Deploy on iOS and Android using: `npx eas-cli build` — [Learn more](https://expo.dev/eas)

## 📝 Notes

- [Expo Router: Docs](https://docs.expo.dev/router/introduction/)

## Weight history search

“Ask about your weight history” sits above Log weight. The app first tries its
local parser against all saved records. Supported local questions get an
immediate answer without a Claude call or comment. Local searches include
first/last weights, inclusive weight ranges, strict or inclusive comparisons,
and highest/lowest records (including ties).

Questions the local parser cannot handle go to the backend's `/weight-search`
endpoint. Claude Sonnet 5.5 can request filtered weight history and calculated
summaries through validated read-only tools, then return an answer and an optional
comment. This supports date restrictions and comparisons between periods without
adding a parser rule for each question. Relevant summaries and limited record
samples are sent to Claude; database credentials and unrelated records stay on
the backend. See `../api/README.md` for setup, limits, and data handling.

Both paths show matching records in the list and highlight their points in orange
on the graph. Clear search or selecting a date range discards pending results.
If Claude is unavailable, unsupported local questions display an error; supported
local questions continue working.

Run the search regression checks with `npm run test:search` from `apps/app`.
