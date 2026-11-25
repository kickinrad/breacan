# breacan edit

`breacan edit` runs a local editor for a kit. It serves the project's pages with a Kit panel, previews each change live, and saves edits straight into the kit's source files.

```sh
breacan edit [--port <n>]
```

The port is 4400 by default. The command builds every output, then serves the project at `http://localhost:<port>/`. That page is the playground when the config has one. The Kit panel is at `/_breacan/panel`.

## What it edits

Edits go into `theme.toml` when the kit has one, or else into the colours in `tokens/*.tokens.json`.

- Each edit builds in memory exactly as `breacan build` builds, derived roles and contrast included.
- Nothing is written until a save.
- A save changes only the edited values, each on its own line, so `git diff` shows them alone.
- A draft with a contrast pair under its floor is not saved.
- A change on disk to the kit's folder or `tokens/` rebuilds every output.

## The Kit panel

The panel shows every colour, with the pairs the kit is held to, their live ratios and whether they pass. It shows the faces by the type roles that read them. It shows the kit's own lengths and times in `[tokens]` as sliders with their units. Each control has a reset, and Save writes the draft. The panel uses the kit's own CSS variables.

## Endpoints

| Endpoint | Does |
| --- | --- |
| `POST /_breacan/edit` | Takes `{ "<path>": value }`, builds the draft and answers with the pairs under their floors. `null` drops an edit. |
| `POST /_breacan/save` | Writes the edits into the token files and rebuilds. |
| `GET /_breacan/live` | Returns the current draft: the `css` output's text, its faces' stylesheets and the kit's tokens per mode. |
| `GET /_breacan/events` | Sends server-sent events: `live` after every edit, and `reload` after a rebuild from disk. |
| `GET /_breacan/panel` | Serves the Kit panel. |

An edit path is a `theme.toml` path, such as:

- `"palette.night.primary": "#fd5416"`
- `"faces.brand": ["Archivo", "sans-serif"]`
- `"tokens.acme.layout.gap": "12px"`

In a kit with no `theme.toml`, the path is a colour token's path, such as `"color.brand": "#fd5416"`.

On save, each edited value in `theme.toml` keeps its key, comment and `why`, and a new key joins its table. In a tokens file, only the token's `$value` changes.

## Security

The server listens on `127.0.0.1` and answers only to the host names `localhost` and `127.0.0.1` with its port. Any other host name, such as a LAN name or a DNS-rebinding page's, gets a 403. Only a page the server itself serves can edit or save, so a request from another origin is refused.

## Limits

- A kit with no `theme.toml` edits literal colours only: no aliases, other types or colour objects. Give the kit a `theme.toml` to edit more.
- A kit with no `theme.toml` shows contrast only where it declares its pairs or sets Material's roles. A `theme.toml` lifts this too.
- A token name with a `.` in it is not found in a tokens file. Lift this when a kit needs such a name.
- Nothing is editable when a resolver governs `tokens/`. Lift this when a resolver kit needs the panel.
