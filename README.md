# NFL Stats Radar Data API

This is a long overdue enhancement to my nfl-stats-radar website. For the longest time, the website itself had a local copy of the DB which contains all of the NFL stats I display. In addition, it was initialized once on server startup and had no capability to be updated on the fly or in even a semi-automated fashion. The DB size is only continuing to grow and some future features I have in mind will require even more data in the DB which means the old (current) setup is basically holding me back somewhat.

This project is an effort to have a separate Data API for the website. Let's see how it goes.

## Building + Running the Data API

You can run the server locally without a container using:

```bash
npm run dev
```

You can run the server locally in a Docker container using:

```bash
docker build -t nsr-data-api .
docker run --rm --name nsr-data-api -p <-PORT->:<-PORT-> --env-file <local env file> nsr-data-api
```

## Progress

- [x] Basic server setup and containerization
- [ ] _{in progress}_ Migrate all of the nfl-stats-radar API routes from Next.js layer to here
- [ ] Implement the API key logic (generation, maintenance, persistence, rotation, etc.)
- [ ] Deploy the API to Railway
- [ ] Test local nfl-stats-radar instance connected to hosted Data API instance
- [ ] Test prod/PR instance of nfl-stats-radar with hosted Data API instance

## License

MIT

## References
The data that NFL Stats Radar relies on comes from a public repo provided by nflverse. I use the player season stats data specifically for this project but the repo has even more detailed data from current and past seasons. All of this data can be accessed and downloaded from [here](https://github.com/nflverse/nflverse-data/releases).

Here is a link to nflverse's main GitHub page as well: https://github.com/nflverse
