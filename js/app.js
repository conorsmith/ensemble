class Actor {
    constructor(id, name, filmIds) {
        this.id = id;
        this.name = name;
        this.filmIds = filmIds;
        this.filmsGuessed = 0;
    }

    addGuess(filmId) {
        if (this.filmIds.includes(filmId)) {
            this.filmsGuessed++;
        }
    }

    hasBeenGuessed() {
        return this.filmsGuessed > 0;
    }

    isInFilm(filmId) {
        return this.filmIds.includes(filmId);
    }
}

class Film {
    constructor(id, title, year) {
        this.id = id;
        this.title = title;
        this.year = year;
    }
}

class Guess {
    constructor(filmId) {
        this.filmId = filmId;
    }
}

class SolutionComponent {
    constructor(actors, films) {
        this.actors = actors;
        this.films = films;
    }

    isASingleFilm() {
        return this.films.length === 1;
    }

    isAnEntireFilmography() {
        return this.films.length === 0;
    }
}

class Game {
    constructor(date, actorsData, solutionsData) {
        this.date = date;
        this.target = solutionsData[0].length;

        const actors = actorsData.map(data => new Actor(data.id, data.name, data.films));

        if (this.hasPersistedData()) {
            this.getPersistedData('actors').forEach(storedActor => {
                actors.find(actor => actor.id === storedActor.id).filmsGuessed = storedActor.filmsGuessed;
            });
        }

        this.actorsRepo = new ActorRepository(actors);

        const guesses = [];
        const guessedFilmIds = [];

        if (this.hasPersistedData()) {
            this.getPersistedData('guesses').forEach(guessedFilmId => {
                guesses.push(new Guess(guessedFilmId));
                guessedFilmIds.push(guessedFilmId);
            });
        }

        this.guessesRepo = new GuessRepository(guesses, guessedFilmIds);

        this.solutionsData = solutionsData;
    }

    guess(guess) {
        this.guessesRepo.addGuess(guess);
        this.actorsRepo.addGuess(guess);
        this.persist();
    }

    hasGuess(guess) {
        return this.guessesRepo.includes(guess);
    }

    checkForWin() {
        return this.actorsRepo.allActorsHaveBeenGuessed();
    }

    createSolutions() {
        return this.solutionsData.map(solution => {
            return solution.map(filmIds => {
                if (typeof filmIds === "string") {
                    return new SolutionComponent(
                        [game.actorsRepo.actors.find(actor => actor.id === filmIds)],
                        []
                    );
                } else if (filmIds.length === 1) {
                    return new SolutionComponent(
                        game.actorsRepo.findActorsInFilms(filmIds),
                        [films.find(film => film.id === filmIds[0])]
                    );
                } else {
                    return new SolutionComponent(
                        game.actorsRepo.findActorsInFilms(filmIds),
                        filmIds.map(filmId => films.find(film => film.id === filmId))
                    );
                }
            });
        });
    }

    hasPersistedData() {
        return window.localStorage.getItem('game-' + this.date) !== null;
    }

    getPersistedData(key) {
        return JSON.parse(window.localStorage.getItem('game-' + this.date))[key];
    }

    persist() {
        window.localStorage.setItem('game-' + this.date, JSON.stringify({
            'guesses': this.guessesRepo.guesses.map(guess => guess.filmId),
            'actors': this.actorsRepo.actors.map(actor => {
                return {
                    "id": actor.id,
                    "filmsGuessed": actor.filmsGuessed
                };
            })
        }));
    }
}

class Clock {
    constructor() {
        this.now = new Date();
    }

    asYmd(date) {
        return date.getUTCFullYear()
            + "-" + (date.getUTCMonth() + 1).toString().padStart(2, "0")
            + "-" + date.getUTCDate().toString().padStart(2, "0");
    }


    todayAsYmd() {
        return this.now.getUTCFullYear()
            + "-" + (this.now.getUTCMonth() + 1).toString().padStart(2, "0")
            + "-" + this.now.getUTCDate().toString().padStart(2, "0");
    }

    tomorrowAtMidnight() {
        const tomorrow = new Date();
        tomorrow.setUTCDate(this.now.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        return tomorrow;
    }

    timeUntilTomorrowAtMidnightAsHis() {
        const timeLeft = this.tomorrowAtMidnight() - (new Date()).getTime();
        const hours = Math.floor(timeLeft / 1000 / 60 / 60);
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        return hours + ":" + minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
    }

    isInTheFuture(ymdDate) {
        const date = new Date();
        date.setUTCFullYear(ymdDate.split("-")[0]);
        date.setUTCMonth(ymdDate.split("-")[1] - 1);
        date.setUTCDate(ymdDate.split("-")[2]);

        date.setUTCHours(0, 0, 0, 0);

        return date >= this.now;
    }

    createDateFromYmd(ymdDate) {
        const date = new Date();
        date.setUTCFullYear(ymdDate.split("-")[0]);
        date.setUTCMonth(parseInt(ymdDate.split("-")[1], 10) - 1);
        date.setUTCDate(ymdDate.split("-")[2]);

        return date;
    }

    getMonthName(date) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        return monthNames[date.getUTCMonth()] + " " + date.getUTCFullYear();
    }

    getFirstDayOfTheMonth(date) {
        date.setUTCDate(1);

        return date.getUTCDay();
    }

    getNumberOfDaysInMonth(date) {
        date.setUTCMonth(date.getUTCMonth() + 1);
        date.setUTCDate(0);

        return date.getDate();
    }
}

class GameRepository {
    constructor(games, clock) {
        this.games = games;
        this.clock = clock;
    }

    today() {
        return this.games.find(game => game.date === this.clock.todayAsYmd());
    }

    find(date) {
        if (date === null) {
            return this.today();
        }

        if (clock.isInTheFuture(date)) {
            return this.today();
        }

        const game = this.games.find(game => game.date === date);

        if (game !== undefined) {
            return game;
        }

        return this.today();
    }
}

class GuessRepository {
    constructor(guesses, guessedFilmIds) {
        this.guesses = guesses;
        this.guessedFilmIds = guessedFilmIds;
    }

    addGuess(guess) {
        this.guesses.push(guess);
        this.guessedFilmIds.push(guess.filmId);
    }

    includes(filmId) {
        return this.guessedFilmIds.includes(filmId);
    }

    count() {
        return this.guesses.length;
    }
}

class ActorRepository {
    constructor(actors) {
        this.actors = actors;
    }

    addGuess(guess) {
        this.actors.forEach(actor => {
            actor.addGuess(guess.filmId);
        });
    }

    allActorsHaveBeenGuessed() {
        return this.actors.reduce((carry, actor) => carry && actor.hasBeenGuessed(), true);
    }

    countActorsInFilm(filmId) {
        return this.actors.reduce((carry, actor) => carry + actor.isInFilm(filmId), 0)
    }

    findActorsInFilms(filmIds) {
        return this.actors.filter(actor => filmIds.every(filmId => actor.isInFilm(filmId)));
    }
}

class GameSelector {
    constructor(clock, date) {
        this.clock = clock;
        this.date = date;
    }

    lastMonth() {
        const date = this.clock.createDateFromYmd(this.date);
        date.setUTCMonth(date.getUTCMonth() - 1);
        this.date = this.clock.asYmd(date);
    }

    nextMonth() {
        const date = this.clock.createDateFromYmd(this.date);
        date.setUTCMonth(date.getUTCMonth() + 1);
        this.date = this.clock.asYmd(date);
    }
}

document.addEventListener('DOMContentLoaded', function(event) {

    const filmsForAutocomplete = films.map(film => {
        return {
            value: film.id,
            label: film.title + " (" + film.year + ")",
            target: film.title
        }
    });

    let autocompleteMatch = false;

    const ac = new Autocomplete(document.querySelector("input"), {
        data: filmsForAutocomplete,
        maximumItems: 10,
        onInput: input => {
            let matches = films.filter(film => film.title.toLowerCase() === input.toLowerCase());
            if (autocompleteMatch) {
                autocompleteMatch = false;
                ac.setData(filmsForAutocomplete);
            }
            if (matches.length === 0) {
                return;
            }
            autocompleteMatch = true;
            ac.setData(matches.map(match => {
                return {
                    value: match.id,
                    label: match.title + " (" + match.year + ")",
                    target: match.title
                };
            }).concat(filmsForAutocomplete.filter(acData => matches.every(match => match.id !== acData.value))));
        },
        onSelectItem: ({label, value}) => {
            ac.field.value = "";
            guess(value);
        }
    });

    document.querySelector("form").onsubmit = function (e) {
        e.preventDefault();
    };

    if (game.checkForWin()) {
        renderWin(game.guessesRepo.count(), game.target, game.date, game.createSolutions());
    }

    renderCounter(game.guessesRepo.count(), game.target);

    renderActors(game.actorsRepo.actors);

    renderGuessesWithinTarget(game.target);

    game.guessesRepo.guesses.forEach((guess, index) => {
        renderGuessedFilms(
            films.find(film => film.id === guess.filmId),
            game.actorsRepo.countActorsInFilm(guess.filmId),
            index + 1
        );
    });

    renderPastGameSelector(gameSelector.date);

    document.getElementById("last-month").onclick = function (e) {
        e.preventDefault();
        if (!e.currentTarget.classList.contains("interactive-icon")) {
            return;
        }
        gameSelector.lastMonth();
        renderPastGameSelector(gameSelector.date);
    }

    document.getElementById("next-month").onclick = function (e) {
        e.preventDefault();
        if (!e.currentTarget.classList.contains("interactive-icon")) {
            return;
        }
        gameSelector.nextMonth();
        renderPastGameSelector(gameSelector.date);
    }
});

function clearStorage() {
    window.localStorage.clear();
    window.location.reload();
}

const clock = new Clock();
const films = filmData.map(data => new Film(data.id, data.title, data.year));
const gamesRepo = new GameRepository(
    gamesData.map(data => new Game(data.date, data.actors, data.solutions)),
    clock
);
const game = gamesRepo.find((new URLSearchParams(window.location.search)).get("date"));
const gameSelector = new GameSelector(clock, game.date);

function guess(guessedFilmId) {
    if (game.hasGuess(guessedFilmId)) {
        return;
    }

    const guess = new Guess(guessedFilmId);

    game.guess(guess);

    if (game.checkForWin()) {
        renderWin(game.guessesRepo.count(), game.target, game.date, game.createSolutions());
    }

    renderCounter(game.guessesRepo.count(), game.target);

    renderActors(game.actorsRepo.actors);

    renderGuessedFilms(
        films.find(film => film.id === guess.filmId),
        game.actorsRepo.countActorsInFilm(guess.filmId),
        game.guessesRepo.count()
    );
}

function renderWin(totalGuesses, target, date, solutions) {
    document.querySelector("input").style.display = "none";
    document.getElementById("counter").style.display = "none";
    document.getElementById("win-counter").innerText = totalGuesses;
    document.getElementById("win").style.removeProperty("display");
    if (totalGuesses === 1) {
        document.getElementById("win-plural").style.display = "none";
    }
    if (totalGuesses > target) {
        document.getElementById("win-target").innerText = target;
        document.getElementById("win-miss").style.removeProperty("display");
    }

    let tweetEmojis = "";

    for (let i = 0; i < totalGuesses; i++) {
        if (i < target) {
            if (totalGuesses === target) {
                tweetEmojis += "🟢";
            } else {
                tweetEmojis += "🔴";
            }
        } else {
            tweetEmojis += "⭕";
        }
    }

    const tweet = "Ensemble "
        + date + " "
        + totalGuesses + "/" + target + "\n"
        + tweetEmojis + "\n"
        + "http://ensemble.conorsmith.ie/";

    document.getElementById("twitter-share").href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(tweet);

    document.getElementById("time-to-next").innerText = clock.timeUntilTomorrowAtMidnightAsHis();
    setInterval(function () {
        document.getElementById("time-to-next").innerText = clock.timeUntilTomorrowAtMidnightAsHis();
    }, 1000);

    solutions.forEach(solution => {
        let solutionElContainer = document.createElement("div");
        solutionElContainer.innerHTML
            = "<ul class=\"solution list-group\">"
            + "</ul>";

        solution.forEach(component => {
            let componentElContainer = document.createElement("div");
            if (component.isAnEntireFilmography()) {
                componentElContainer.innerHTML
                    = "<li class=\"list-group-item\">"
                    + "Any <span class=\"text-muted\">" + component.actors[0].name.replace(" ", "&nbsp;") + "</span> film"
                    + "</li>";
                solutionElContainer.firstChild.append(componentElContainer.firstChild);
                return;
            }

            let lastActor = component.actors.pop().name.replace(" ", "&nbsp;");
            let actorList = component.actors.map(actor => actor.name.replace(" ", "&nbsp;"));

            if (component.isASingleFilm()) {
                componentElContainer.innerHTML
                    = "<li class=\"list-group-item\">"
                    + "<div>" + component.films[0].title + " <span class=\"fw-light\">(" + component.films[0].year + ")</span></div>"
                    + "<div class=\"text-muted\">for " + actorList.join(", ") + " &amp;&nbsp;" + lastActor + "</div>"
                    + "</li>";
            } else {
                componentElContainer.innerHTML
                    = "<li class=\"list-group-item\">"
                    + "<div>One of</div>"
                    + "<ul>"
                    + component.films.map(film => "<li>" + film.title + " <span class=\"fw-light\">(" + film.year + ")</span></li>").join("")
                    + "</ul>"
                    + "<div class=\"text-muted\">for " + actorList.join(", ") + " &amp;&nbsp;" + lastActor + "</div>"
                    + "</li>";
            }

            solutionElContainer.firstChild.append(componentElContainer.firstChild);
        })

        document.getElementById("solutions").append(solutionElContainer.firstChild);
    })
}

function renderCounter(totalGuesses, target) {
    document.getElementById("counter-current").innerText = totalGuesses;
    document.getElementById("counter-target").innerText = target;
    document.getElementById("counter-current").style.removeProperty("display");
    document.getElementById("counter-target").style.removeProperty("display");
}

function renderActors(actors) {
    let actorEl;
    actors.forEach((actor, index) => {
        actorEl = document.querySelectorAll("#actors .actor")[index];
        actorEl.querySelector(".actor-name").innerText = actor.name;
        if (actor.hasBeenGuessed()) {
            actorEl.querySelector(".counter").innerText = actor.filmsGuessed;
            actorEl.querySelector(".counter").style.removeProperty("display");
            actorEl.querySelector("i").style.removeProperty("display");
        }
    });
}

function renderGuessesWithinTarget(target) {
    const filmsEl = document.querySelector("#films");

    for (i = 0; i < target; i++) {
        if (filmsEl.querySelectorAll("i")[i] !== undefined) {
            filmsEl.querySelectorAll("i")[i].classList.remove("fa-regular");
            filmsEl.querySelectorAll("i")[i].classList.add("fa-solid");
        }
    }
}

function renderGuessedFilms(film, actorCount, guessIndex) {
    const filmsEl = document.querySelector("#films");

    if (guessIndex > 5) {
        let guessElContainer = document.createElement("div");
        guessElContainer.innerHTML
            = "<li class=\"list-group-item d-flex justify-content-between align-items-top\">"
            + "<div class=\"title ms-2 me-auto\">&nbsp;</div>"
            + "<div class=\"guess-info d-flex justify-content-between align-items-center\">"
            + "<span class=\"counter\"></span>"
            + "<i class=\"fa-regular fa-circle\"></i>"
            + "</div>"
            + "</li>"
        filmsEl.insertBefore(guessElContainer.firstChild, filmsEl.querySelector(".fade-out"));
    }

    filmsEl.querySelectorAll("i")[guessIndex - 1].classList.remove("fa-circle");
    if (actorCount > 0) {
        filmsEl.querySelectorAll(".counter")[guessIndex - 1].classList.add("badge", "bg-dark", "rounded-pill");
        filmsEl.querySelectorAll(".counter")[guessIndex - 1].innerText = actorCount;
        filmsEl.querySelectorAll("i")[guessIndex - 1].classList.add("fa-circle-check");
    } else {
        filmsEl.querySelectorAll("i")[guessIndex - 1].classList.add("fa-circle-xmark");
    }

    filmsEl.querySelectorAll(".title")[guessIndex - 1].innerHTML = film.title + " <span class=\"fw-light\">(" + film.year + ")</span>";
}

function renderPastGameSelector(date) {
    date = clock.createDateFromYmd(date);

    const dateOfFirstGame = new Date(2022, 7, 1);

    const pastGameSelectorEl = document.getElementById("past");

    pastGameSelectorEl.querySelector("h6").innerText = clock.getMonthName(date);

    const lastMonth = new Date(date.getTime());
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    lastMonth.setUTCDate(1);
    if (lastMonth < dateOfFirstGame) {
        pastGameSelectorEl.querySelector("#last-month").classList.remove("interactive-icon")
        pastGameSelectorEl.querySelector("#last-month").innerHTML
            = "<i class=\"fa-regular fa-fw fa-circle\"></i>";
    } else {
        pastGameSelectorEl.querySelector("#last-month").classList.add("interactive-icon")
        pastGameSelectorEl.querySelector("#last-month").innerHTML
            = "<i class=\"fa-solid fa-fw fa-circle-arrow-left\"></i>";
    }

    const nextMonth = new Date(date.getTime());
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    nextMonth.setUTCDate(1);
    if (clock.isInTheFuture(clock.asYmd(nextMonth))) {
        pastGameSelectorEl.querySelector("#next-month").classList.remove("interactive-icon")
        pastGameSelectorEl.querySelector("#next-month").innerHTML
            = "<i class=\"fa-regular fa-fw fa-circle\"></i>";
    } else {
        pastGameSelectorEl.querySelector("#next-month").classList.add("interactive-icon")
        pastGameSelectorEl.querySelector("#next-month").innerHTML
            = "<i class=\"fa-solid fa-fw fa-circle-arrow-right\"></i>";
    }

    const firstDay = clock.getFirstDayOfTheMonth(date);
    const daysInMonth = clock.getNumberOfDaysInMonth(date);
    const rows = Math.ceil((firstDay + daysInMonth) / 7);

    document.getElementById("calendar").innerHTML = "";

    for (let i = 0; i < rows; i++) {
        let rowEl = document.createElement("div")
        rowEl.classList.add("btn-group");
        if (i === 0) {
            rowEl.classList.add("btn-group-first");
        }

        for (let j = 0; j < 7; j++) {
            let dateOfMonth = ((i * 7) + j) - firstDay + 1;
            let ymdDate = date.getUTCFullYear()
                + "-" + (date.getUTCMonth() + 1).toString().padStart(2, "0")
                + "-" + dateOfMonth.toString().padStart(2, "0");
            let btnElContainer = document.createElement("div");

            if ((i === 0 && j < firstDay) || dateOfMonth > daysInMonth) {
                btnElContainer.innerHTML
                    = "<a class=\"btn btn-outline-dark disabled\" style=\"color: white;\">"
                    + "00"
                    + "</a>";
            } else if (clock.isInTheFuture(ymdDate)) {
                btnElContainer.innerHTML
                    = "<a class=\"btn btn-outline-dark disabled\">"
                    + dateOfMonth.toString().padStart(2, "0")
                    + "</a>";
            } else {
                btnElContainer.innerHTML
                    = "<a href=\"?date="
                    + ymdDate
                    + "\" class=\"btn btn-outline-dark\">"
                    + dateOfMonth.toString().padStart(2, "0")
                    + "</a>";
            }
            rowEl.append(btnElContainer.firstChild);
        }

        document.getElementById("calendar").append(rowEl);
    }
}
