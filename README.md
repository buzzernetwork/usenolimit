# Buzzer Network Ad Test Site

A realistic publisher test site demonstrating all Buzzer Network ad formats with 2026 market-verified CPM rates.

## Publisher ID
```
ff845fd9-99a1-4a53-96b5-49cc6e51c87e
```

## Pages

| Page | Focus | Key Formats |
|------|-------|-------------|
| `index.html` | Homepage | Hero video, Native, Sidebar ads |
| `test-premium-ads.html` | High-CPM formats | CTV video, Outstream, Interactive |
| `test-emerging-ads.html` | Shoppable/Interactive | Carousel, AR, Gamified |
| `test-mobile-ads.html` | Mobile-first | Stories, Interstitial, Rewarded |

## Ad Formats by CPM

### Premium Video ($25-65 CPM)
- CTV-style hero video
- Outstream video (plays when visible)
- Interactive video (with CTAs)
- Sticky video (bottom-right corner)

### Emerging Formats ($15-40 CPM)
- Shoppable video (product cards)
- 6-second bumper ads
- Stories-style vertical video (9:16)
- AR preview placeholder
- Gamified ads (spin wheel)
- Rewarded video (unlock content)

### Interactive ($10-25 CPM)
- Carousel ads (swipeable)
- Interactive pause ads
- Swipe-up CTA
- Email capture native

### Mobile ($10-18 CPM)
- Mobile interstitial (full-screen)
- Stories format
- Mobile sticky banner

### Display ($3-10 CPM)
- Medium rectangle (300x250)
- Half page (300x600)
- Large rectangle (336x280)
- Native in-feed

### Standard ($1-3 CPM)
- Leaderboard (728x90)
- Mobile banner (320x50)

## Deployment

### Vercel
```bash
cd ad-test-site
vercel --prod
```

### Netlify
```bash
cd ad-test-site
netlify deploy --prod
```

### Any Static Host
Just upload all files - it's pure HTML/CSS.

## Testing Checklist

- [ ] All ad placeholders visible
- [ ] Video ads have 16:9 aspect ratio
- [ ] Mobile responsive (test at 375px)
- [ ] Sticky video appears on scroll
- [ ] Mobile sticky banner shows on mobile only
- [ ] Native ads match content styling
- [ ] Interstitials have close buttons

## Market Data Sources

CPM rates verified from:
- [Keynes Digital - CTV Rates](http://keynes.com/ctv-advertising-rates/)
- [Adwave - CTV CPM Q1 2025](https://adwave.com/resources/average-ctv-cpm)
- [WPP Media - Global Ad Revenue 2025](https://www.wppmedia.com/news/report-this-year-next-year-december-2025)

## License

For testing purposes only. Content is placeholder.
