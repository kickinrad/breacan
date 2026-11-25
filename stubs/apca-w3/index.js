// SPDX-FileCopyrightText: 2026 William Tierney
//
// SPDX-License-Identifier: Apache-2.0

// Leonardo reaches these only for its APCA contrast formula, which Breacán never selects (it asks for WCAG 2 ratios).
const unavailable = () => {
  throw new Error("APCA is not available in Breacán: apca-w3's license is not open source and its dependency is AGPL-3.0. Use WCAG 2 ratios.");
};
export const APCAcontrast = unavailable;
export const sRGBtoY = unavailable;
