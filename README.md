# Four Pillars

Turn-based web game about a national economy. One player sets policy for four institutions each half-year, then resolves the shock already on the table.

## Play

Open `index.html` in a browser. No build step and no server are required.

To publish it with GitHub Pages, set the site source to the `main` branch and the root folder.

## Roles

- Government: worker tax, firm tax, welfare, and infrastructure. Goal is social stability.
- Central Bank: policy rate, reserve requirement, and emergency money creation. Goal is price and financial balance.
- Firms: prices, wages, new loans, and productivity investment. Goal is growth without missing interest.
- Workers: consumption appetite and how surplus income is saved or invested in firms.

## Round

1. An event is revealed.
2. Adjust all four roles.
3. Advance six months.
4. Read household cover, interest cover, and the public accounts.
5. Repeat for 10 turns (5 years), unless a crisis ends the game.

## Failures

- Household cover below 65% for two consecutive halves.
- Firm interest cover below 70% for two consecutive halves.
- Social stability at 0.
- Financial stability at 0.
- Inflation above 50% with currency confidence below 15.

Survival is not the same as a good score. Reckless stimulus can finish five years with a weak verdict.
