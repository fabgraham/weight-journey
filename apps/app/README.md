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

“Ask your weight history” sits above Log weight. It searches all saved entries,
shows matching entries in the list, and highlights their individual points in
orange on the graph. Clear search restores the selected date range.

Supported examples:

- When was the last time I was 65kg or more?
- When was the last time my weight was more than 65kg?
- When was I first below 70kg?
- Show weights at least 65kg
- What was my lowest weight?

Supported wording uses a local question parser with no API cost. Unfamiliar
wording falls back to Claude Haiku 5.5 through the backend's `/weight-search`
endpoint when `ANTHROPIC_API_KEY` is configured on the API service. Only the
question is sent to Claude; weight records remain in the app. The backend
validates the interpreted search before the app calculates the answer locally.
Unsupported date restrictions, units, or operations show examples to try instead.
Clear search or selecting a date range discards any pending interpretation.
See `../api/README.md` for backend setup and mocked fallback tests.
“65kg or more” includes 65kg; “more than 65kg” excludes it. First/last questions
return one recorded entry, including when “times” is used instead of “time”.

Run the search regression checks with `npm run test:search` from `apps/app`.
