# breacan-apple

Apple's iOS foundations for Breacán.

## Install

Install the reference skill from the Breacán market with `/plugin install breacan-apple --marketplace kickinrad/breacan`.

## Usage

In a kit, set `platforms: { ios: { language: "apple", dial: "tinted" } }`.

The language provides tokens for every foundation and system chrome. It provides no native component code. The dial's platform tokens represent the default light appearance and Dynamic Type Large size. Apple's system colours, fonts, materials, and motion adapt at runtime, so native apps should use Apple's system APIs.

Shortcut: Breacán chooses illustrative scales for corners, motion durations, and elevation because Apple's HIG gives guidance but no fixed token scale. Revisit them when a native output or a kit requires a measured control design.

## Contributing

Open a pull request at [kickinrad/breacan](https://github.com/kickinrad/breacan).

## License

UNLICENSED.
