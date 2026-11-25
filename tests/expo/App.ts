// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

import { Platform, type TextStyle } from "react-native";
import { themes, type ThemeMode, type ThemePlatform } from "./theme";

const mode: ThemeMode = "light";
const platform: ThemePlatform = Platform.select({ ios: "ios", android: "android", default: "android" });
export const theme = themes[platform][mode];
export const heading: TextStyle = theme.textStyles["headline-large"];
export const primary: string = theme.tokens.md.sys.color.primary;
// @ts-expect-error: the kit does not list web as an Expo platform.
themes.web.light;
// @ts-expect-error: the kit has light and dark modes only.
themes.ios.dusk;
