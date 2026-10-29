# NFL Stats Radar Data API

This is a long overdue enhancement to my nfl-stats-radar website. For the longest time, the website itself had a local copy of the DB which contains all of the NFL stats I display. In addition, it was initialized once on server startup and had no capability to be updated on the fly or in even a semi-automated fashion. The DB size is only continuing to grow and some future features I have in mind will require even more data in the DB which means the old (current) setup is basically holding me back somewhat.

This project is an effort to have a separate Data API for the website. Let's see how it goes.
