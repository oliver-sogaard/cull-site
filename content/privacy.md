# Privacy policy

Version 3 · October 2026

This policy is written in plain language.

## The short version

CULL runs on your computer. Your photographs, your verdicts and your settings stay there. CULL contacts its update server, and, with a license, its license service; nothing else leaves your computer unless you send it, and you can read everything before you do.

## What CULL keeps on your computer

- Your settings, your recent folders, your license key and its current confirmation, in the app's own data folder.
- A log file that records what the app did, for troubleshooting. Before a line is written, every file and folder path in it is reduced to its file extension. The log never contains a name of yours, of a client, or of a folder.
- Verdicts, written next to your photographs as XMP sidecar files, or inside a DNG, where Lightroom reads them.

## What leaves your computer, and when

- **Update check.** When CULL starts, it asks GitHub, where releases are hosted, for the newest version. As with any web request, GitHub sees your IP address; the request carries nothing else about you or your photographs.
- **A problem report.** Only when you send one. It contains what you typed, and, if you tick the box, diagnostics: the app version, your operating system, how many processor threads and how much memory the computer has, counts of file types in the shoot, your settings without any path, and the last lines of the log. The whole report is shown to you before it leaves, and paths are reduced to file extensions once more on the way out. Pressing Send delivers it to CULL's report endpoint, which runs on Cloudflare and stores it as a private issue in a GitHub repository that only the author can read; you get a ticket number back. A problem report can also carry up to three screenshots, and they go only when you add them. A screenshot of CULL can show your photographs, so add one only if that is fine. Screenshots are stored on Cloudflare (R2), where only the author can open them, and they are kept with the report. The endpoint accepts five reports a minute from one address and keeps nothing else about you. You can instead save the report as a file, copy it, or send it by email through your own mail program. The email address is optional and is used only to reply.
- **Adding a license, and checking it afterwards.** A license key works on a set number of computers (two for a standard license), so when you add one, CULL tells the license service, which runs on Cloudflare and is operated by the author, which computer this is: the key, an identifier derived from this installation and this machine, the computer's name as your operating system reports it, which operating system it is, and the app version. The service answers with a signed confirmation that is good for 30 days. CULL checks it again at each start, when you open Settings → License, and about every twelve hours while it runs, whenever it is online. Nothing else is sent: no photographs, no paths, no settings. As with any web request, the service sees your IP address, which it uses only to limit how often one address may call it. The service keeps the key, the email address the key was bought or issued for, the computers using it (name, operating system, app version and the date each was last seen), and a log of changes to the license. The license, its computers (including ones removed from it) and its log are kept while the license can be used. After it ends or is withdrawn, a license that was paid for is kept until five years after the end of the year of its last purchase or refund, as Danish bookkeeping law requires, and a license that was never paid for is kept for 90 days; then the service deletes them on its own. You can ask the author to delete them sooner where the law allows. Cloudflare hosts the license service and its database, and Resend sends the email with your key, so your email address and your key pass through Resend; both process this on the author's behalf under their own privacy terms. The author can see this information on an administration page, to help you with your license; nobody else can. You can see and remove the computers using your key in Settings → License. If the service withdraws the key, ends the license or removes this computer, CULL forgets the key and keeps only a note of what happened and when, so Settings can say so; the note goes a day after you have seen it, or when a key is entered.
- **Buying CULL Pro, on the website.** Pro is bought on cull.photography through Paddle, the merchant of record: Paddle is the seller, takes the payment and keeps what a sale needs (your email address, country, postcode and payment details) under its own privacy terms. The author never sees your card. When a payment goes through, Paddle tells the license service, with its own ids for the customer, the purchase and the subscription and the email address you paid with, so the key can be issued and sent to you; refunds, renewals and cancellations are told the same way. The page that shows the key after payment asks the license service for it with the purchase id, which stays in your browser, and only for two hours. The page for a lost key takes an email address and sends that address its keys again; it uses Cloudflare Turnstile to tell people from bots, which sees your IP address and browser details under Cloudflare's privacy terms. The website itself keeps no account, sets no tracking cookie and runs no analytics.

CULL sends no usage statistics and no crash reports on its own, and it never uploads a photograph or a thumbnail. The one exception is a screenshot you add to a problem report yourself.

## Where reports go

A report you send is kept by the author in a private issue tracker (GitHub) or, if you emailed it, in a mailbox, either of which only the author can read, for as long as the problem is open and then for up to two years, so that a returning problem can be recognized. Screenshots sent with a report are kept on Cloudflare (R2) for the same time and deleted with it. Cloudflare and GitHub process the report on the author's behalf under their own privacy terms; neither receives your photographs, except what a screenshot you added shows.

## Your rights

You can see what CULL keeps: Settings → Storage opens the log folder, and a report is saved as a readable file. You can delete the data folder at any time; the app then starts as new. If you have sent a report and want it deleted, write to the support address shown in the app, under About, and it will be removed.

Under the GDPR you also have the right to access, correct and export personal data held about you, and to complain to your data protection authority.

## Changes

When this policy changes, the new version, with its date at the top, is in About, and what's new says that it changed.

## Contact

The author, Oliver Søgaard-Andersen, is the data controller. Reach him at the support address shown in the app, under About.
