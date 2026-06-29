// Cross-browser namespace. Firefox exposes the promise-based `browser`;
// Chrome (MV3, v88+) returns promises from `chrome.*` when no callback is given.
// Using one reference lets the rest of the code await every call.
globalThis.RS = globalThis.browser || globalThis.chrome;
