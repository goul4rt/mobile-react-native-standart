# Maestro flows

```bash
npm run e2e           # everything except offline
npm run e2e:offline   # with the API stopped
```

Needs: a simulator open, Metro running (`npm start`) and the local API on the
port `DEV_PORT` in `src/shared/api/client.ts` names. Without the API, only
`offline.yaml` makes sense.

## The flows assert English

The app follows the device locale, and these flows are written against the
English strings. On a simulator set to Portuguese every text assertion fails
while every `testID` still matches, which reads as a broken app and is a broken
locale. `preferences.yaml` is the exception on purpose: it switches to
Portuguese, checks the interface followed, and switches back.

When a string changes in `src/shared/i18n/translations.ts`, the flow asserting it
changes too. There is no test tying the two together.

## Order dependency

Only `onboarding` and `full-cycle` use `clearState: true`. The others start with
`clearState: false` and assume a session already exists, so they **depend on one
of those having passed first**. When onboarding fails, the remaining five fail in
cascade with "area-MT is not visible" — which looks like
five defects and is one.

When investigating a failure, run the flow on its own before believing the count:

```bash
maestro test .maestro/onboarding.yaml
```

## Two iOS traps that already cost time here

**The keyboard covers whatever sits below the field.** `hideKeyboard` is not
always enough: if the next element is near the bottom of the screen, use
`scrollUntilVisible` before tapping or asserting. That is what broke the tap on
the consent checkbox.

**A `testID` on a `<Text>` nested inside a `<Text>` does not exist.** iOS renders
the paragraph as a single node and the children disappear from the accessibility
tree — `accessible={false}` on the parent does not change that. If an element
needs to be tapped or checked, it has to be a real `Pressable`, not a `<Text>`
with `onPress` inside another text. This holds for the app, not just the test:
what is not in the tree does not exist for VoiceOver either.

To see what Maestro actually sees:

```bash
maestro hierarchy | grep -oE '"resource-id" : "[^"]+"' | sort -u
```
