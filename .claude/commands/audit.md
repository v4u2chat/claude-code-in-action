Your goal is to update dependencies to fix vulnerabilities

This audit command does three things:

1. Run `npm audit` to find vulnerable installed packages
2. Runs `npm audit fix` to apply updates
3. Runs tests to verify the updates didn't break anything