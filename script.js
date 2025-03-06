document.addEventListener("DOMContentLoaded", async function () {
    let today = new Date();
    let dateStr = today.getDate().toString().padStart(2, '0') + "-" +
                  (today.getMonth() + 1).toString().padStart(2, '0') + "-" +
                  today.getFullYear();

    // **Opdater den gregorianske dato**
    function updateDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = today.toLocaleDateString('da-DK', options);
        
        // **Sæt den i HTML**
        document.getElementById("date").textContent = "Dato: " + formattedDate;
    }

    // **Hent Hijri-dato via API**
    async function fetchHijriDate() {
        try {
            const response = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
            const data = await response.json();

            if (data.code === 200) {
                const hijriDate = `${data.data.hijri.weekday.en}, ${data.data.hijri.day} ${data.data.hijri.month.en} ${data.data.hijri.year} AH`;
                
                // **Sæt Hijri-dato i HTML**
                document.getElementById("day").textContent = "Hijri-dato: " + hijriDate;
            } else {
                console.error("Fejl: Kunne ikke hente Hijri-dato.");
            }
        } catch (error) {
            console.error("Fejl ved hentning af Hijri-dato:", error);
        }
    }

    // **Opdater begge datoer**
    updateDate();
    await fetchHijriDate(); // Henter Hijri-dato fra API

    // **Hent bedetider fra CSV**
    fetch("bedetider.csv?nocache=" + new Date().getTime())
        .then(response => response.text())
        .then(data => {
            let rows = data.trim().split("\n").map(row => row.replace(/\r/g, "").split(",").map(cell => cell.trim()));
            let todayRow = rows.find(row => row[0] === dateStr);

            if (!todayRow || todayRow.length < 8) {
                console.error("Fejl: Ingen bedetider fundet for i dag.");
                return;
            }

            // **Indsæt bedetider i HTML**
            document.getElementById("fajr-time").textContent = todayRow[2];
            document.getElementById("suruk-time").textContent = todayRow[3];
            document.getElementById("dhuhr-time").textContent = todayRow[4];
            document.getElementById("asr-time").textContent = todayRow[5];
            document.getElementById("maghrib-time").textContent = todayRow[6];
            document.getElementById("isha-time").textContent = todayRow[7];

            // **Start nedtælling til næste bøn**
            updateCountdown(todayRow);
        })
        .catch(error => console.error("Fejl ved indlæsning af data:", error));
});

// **Nedtælling til næste bøn**
function updateCountdown(todayRow) {
    let now = new Date();
    let prayerNames = ["Fajr", "Suruk", "Dhuhr", "Asr", "Maghrib", "Isha"];
    
    let prayerTimes = todayRow.slice(2, 8).map(time => {
        let [hour, minute] = time.split(":").map(Number);
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    });

    let nextPrayer = null;
    let nextPrayerName = "";
    for (let i = 0; i < prayerTimes.length; i++) {
        if (now < prayerTimes[i]) {
            nextPrayer = prayerTimes[i];
            nextPrayerName = prayerNames[i];
            break;
        }
    }

    if (!nextPrayer) {
        document.getElementById("next-prayer-name").textContent = "Ingen flere bønner i dag";
        document.getElementById("countdown").textContent = "-";
        return;
    }

    document.getElementById("next-prayer-name").textContent = nextPrayerName;

    function updateTimer() {
        let diff = Math.max(0, nextPrayer - new Date());
        let hours = Math.floor(diff / (1000 * 60 * 60));
        let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById("countdown").textContent =
            `${hours}t ${minutes}m ${seconds}s`;

        if (diff > 0) {
            setTimeout(updateTimer, 1000);
        } else {
            location.reload(); // Genindlæs siden, når bøn starter
        }
    }

    updateTimer();
}
