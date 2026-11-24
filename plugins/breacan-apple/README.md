# breacan-apple

Apple's iOS foundations for Breacán.

## Install

Install the reference skill from the Breacán market with `/plugin install breacan-apple --marketplace kickinrad/breacan`.

## Usage

In a kit, set `platforms: { ios: { language: "apple", dial: "tinted" } }`.

The language gives colour (Apple's default light and dark swatches), type, the 44 pt `touch-min`, SF Symbols and system chrome. It gives no corner, motion, elevation or component values, because Apple publishes no fixed scale for them; the theme's stay. It provides no native component code.

Text sizes are Dynamic Type's default (Large). React Native scales text with the user's setting at runtime, so a native app should still use Apple's system APIs for adaptive type and colour.

## Contributing

Open a pull request at [kickinrad/breacan](https://github.com/kickinrad/breacan).

## License

UNLICENSED.
