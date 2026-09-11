# Ackworth Jaguars Website V2

Full multi-page public site and portal prototype.

Public pages are separate HTML pages, not homepage scroll sections. The portal prototype at `/admin/` covers pages, page builder, media, teams/seasons, fixtures, news, sponsors, documents, navigation and settings.

Production architecture: Cloudflare Workers + Static Assets, D1 for structured content, R2 for media/PDFs, authenticated admin portal, and Workers API. Team records are independent of age labels so U12 can become U13 each season while history remains intact; a new U6 page can be created from a template each season.
