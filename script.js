document.addEventListener("DOMContentLoaded", async function () {
    let today = new Date();
    let dateStr = today.getDate().toString().padStart(2, '0') + "-" +
                  (today.getMonth() + 1).toString().padStart(2, '0') + "-" +
                  today.getFullYear();

    // **Opdater den gregorianske dato**
    function updateDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let formattedDate = new Date().toLocaleDateString('da-DK', options);

        // Gør første bogstav stort
        formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

        document.getElementById("date").textContent = formattedDate;
    }

    // **Hent Hijri-dato via API**
    async function fetchHijriDate() {
        try {
            const response = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}&nocache=${new Date().getTime()}`);
            const data = await response.json();

            if (data.code === 200) {
                const hijriDate = `${data.data.hijri.weekday.en}, ${data.data.hijri.day} ${data.data.hijri.month.en} ${data.data.hijri.year} AH`;
                document.getElementById("day").textContent = hijriDate;
            } else {
                console.error("Fejl: Kunne ikke hente Hijri-dato.");
            }
        } catch (error) {
            console.error("Fejl ved hentning af Hijri-dato:", error);
        }
    }

    // **Opdater begge datoer**
    updateDate();
    await fetchHijriDate();

    // **Hent bedetider fra CSV**
    fetchPrayerTimes();
});

// **Hent bedetider fra CSV**
function fetchPrayerTimes(forNextDay = false) {
    let date = new Date();

    if (forNextDay) {
        date.setDate(date.getDate() + 1);
    }

    let newDateStr = date.getDate().toString().padStart(2, '0') + "-" +
                     (date.getMonth() + 1).toString().padStart(2, '0') + "-" +
                     date.getFullYear();

    console.log("Henter bønnetider for:", newDateStr);

    fetch("bedetider.csv?nocache=" + new Date().getTime())
        .then(response => response.text())
        .then(data => {
            let rows = data.trim().split("\n").map(row => row.replace(/\r/g, "").split(",").map(cell => cell.trim()));

            console.log("Indlæst bedetider.csv:", rows);

            let todayRow = rows.find(row => row[0] === newDateStr);

            if (!todayRow || todayRow.length < 8) {
                console.error("Fejl: Ingen bedetider fundet for dato:", newDateStr);
                return;
            }

            console.log("Fundet bønnetider:", todayRow);

            // **Indsæt bønnetider i HTML**
            document.getElementById("fajr-time").textContent = todayRow[2];
            document.getElementById("suruk-time").textContent = todayRow[3];
            document.getElementById("dhuhr-time").textContent = todayRow[4];
            document.getElementById("asr-time").textContent = todayRow[5];
            document.getElementById("maghrib-time").textContent = todayRow[6];
            document.getElementById("isha-time").textContent = todayRow[7];

            // **Start nedtælling til næste bøn**
            updateCountdown(todayRow, forNextDay);
        })
        .catch(error => console.error("Fejl ved indlæsning af data:", error));
}

// **Nedtælling til næste bøn**
function updateCountdown(todayRow, forNextDay = false) {
    function updateTimer() {
        let now = new Date();

        let prayerNames = ["Fajr", "Suruk", "Dhuhr", "Asr", "Maghrib", "Isha"];
        let prayerTimes = todayRow.slice(2, 8).map(time => {
            let [hour, minute] = time.split(":").map(Number);
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
        });

        console.log("🕰️ Nuværende tid:", now);
        console.log("📅 Bønnetider:", prayerTimes);

        let nextPrayer = null;
        let nextPrayerName = "";
        let activePrayerIndex = -1;

        // Find den aktive bøn (den der er gået ind, men ikke ud endnu)
        for (let i = 0; i < prayerTimes.length; i++) {
            if (now >= prayerTimes[i] && (i === prayerTimes.length - 1 || now < prayerTimes[i + 1])) {
                activePrayerIndex = i; // Denne bøn er aktiv
            }
            if (now < prayerTimes[i] && nextPrayer === null) {
                nextPrayer = prayerTimes[i];
                nextPrayerName = prayerNames[i];
            }
        }

        console.log("➡ Næste bøn er:", nextPrayerName);
        console.log("🔥 Aktiv bøn:", activePrayerIndex !== -1 ? prayerNames[activePrayerIndex] : "Ingen aktiv");

        // Opdater næste bøn i UI
        document.getElementById("next-prayer-name").textContent = nextPrayerName;

        // **Fjern markering fra alle bønner**
        document.querySelectorAll(".prayer-time").forEach(el => {
            el.classList.remove("active-prayer");
        });

        // **Fremhæv aktiv bøn**
        if (activePrayerIndex !== -1) {
            document.getElementById(prayerNames[activePrayerIndex].toLowerCase() + "-time").parentElement.classList.add("active-prayer");
        }

        function countdown() {
            let diff = Math.max(0, nextPrayer - new Date());
            let hours = Math.floor(diff / (1000 * 60 * 60));
            let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            let seconds = Math.floor((diff % (1000 * 60)) / 1000);

            document.getElementById("countdown-hours").textContent = hours.toString().padStart(2, '0');
            document.getElementById("countdown-minutes").textContent = minutes.toString().padStart(2, '0');
            document.getElementById("countdown-seconds").textContent = seconds.toString().padStart(2, '0');

            if (diff > 0) {
                setTimeout(countdown, 1000);
            } else {
                console.log("⏳ Nedtælling færdig. Opdaterer næste bøn...");
                updateCountdown(todayRow);
            }
        }

        countdown();
    }

    updateTimer();
}

