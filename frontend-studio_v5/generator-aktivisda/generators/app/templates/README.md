# <%= AKTIVISDA_ID_SLUG %>.aktivisda.earth

This repository contains the data for the <%= AKTIVISDA_ID %>'s instance of Aktivisda.

## Installation

### Getting started

This repository cannot be used on its own as it requires Aktivisda.

You need to create a sub-directory `aktivisda-core` with aktivisda source code.
You can directly clone `aktivisda` into this subdirectory :

```bash
git clone git@framagit.org:aktivisda/<%= AKTIVISDA_ID_SLUG %>.git
cd <%= AKTIVISDA_ID_SLUG %>
git clone git@framagit.org:aktivisda/aktivisda.git aktivisda-core
```

Or you can create a symbolic link (useful if you manage many instances in your computer) :

```bash
git clone git@framagit.org:aktivisda/<%= AKTIVISDA_ID_SLUG %>.git
git clone git@framagit.org:aktivisda/aktivisda.git aktivisda-core
ln -s <path to aktivisda core> <path to <%= AKTIVISDA_ID_SLUG %>>/aktivisda-core
```

### Installation

You can execute `npm` commands in `<%= AKTIVISDA_ID_SLUG %>` directory:

```
npm install
```

will call `npm install` in `aktivisda-core` (nothing done in `<%= AKTIVISDA_ID_SLUG %>`)

```
npm run serve
```

It will copy the data from `<%= AKTIVISDA_ID_SLUG %>` to `aktivisda-core` and then start call `npm run serve` in `aktivisda-core`.

Aktivisda will be accessible at `localhost:8080`

## Contributing

It's recommended to modify this repository through Backtivisda
