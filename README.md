# Matrice Rentabilité Horlogère

Outil de calcul de rentabilité pour une activité de négoce de montres vintage japonaises (sourcing ZenMarket → revente Vinted / LeBonCoin / Chrono24).

## Lancer l'outil en local

```bash
npm install
npm run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000)

## Fonctionnalités

### Achat direct / Enchère
Saisir les prix de vente cibles par canal → l'outil calcule le prix d'achat maximum en ¥ pour atteindre la marge nette cible.
- Mode **Achat direct** : frais ZenMarket 800 ¥
- Mode **Enchère** : frais ZenMarket 500 ¥
- Prend en compte : taux Wise, TVA IOSS 20%, envoi estimé, intervention, commissions canaux

### Colis
Saisir les colis réels (référence, transporteur, envoi ¥, TVA payée ¥, frais Wise €) avec chaque montre dedans.
- Landed cost réel calculé au **prorata du prix d'achat** de chaque montre
- Prix de revente minimum affiché par canal pour chaque montre
- Enregistrement de la vente (canal + prix) → profit et marge nette en temps réel

### Dashboard
- P&L planning (hypothèses mensuelles)
- P&L réel consolidé à partir des colis saisis

### Roadmap
Projection sur 24 mois du capital et du salaire en fonction du taux de réinvestissement.

## Stack

- [Next.js 15](https://nextjs.org/) + React 19
- TypeScript
- Recharts (graphiques)
- localStorage (persistance)
