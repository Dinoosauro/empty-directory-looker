if ('serviceWorker' in navigator) {
    let registration;
    const registerServiceWorker = async () => {
        registration = await navigator.serviceWorker.register('./service-worker.js', { scope: window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1) });
    };
    registerServiceWorker();
}
let globalHandle;
if ((window.showDirectoryPicker ?? "") === "") {
    document.getElementById("notSupportedError").style.display = "block";
    document.getElementById("deleteEmpty").disabled = true;
}
document.getElementById("itemSelect").addEventListener("click", async () => {
    if ((window.showDirectoryPicker ?? "") !== "") {
        let fileEntryArr = {};
        let getDir = await window.showDirectoryPicker();
        document.getElementById("itemSelect").disabled = true;
        generalHandle = getDir;
        async function getDirectoryValues(handle, path) {
            for await (let entry of handle.values()) {
                if (entry.kind === "file") {
                    if (entry.name === ".DS_Store") continue;
                    console.log(path);
                    fileEntryArr[path].push({
                        type: "file",
                        fullPath: `${path}/${entry.name}`,
                        path: path
                    })
                } else {
                    fileEntryArr[`${path}/${entry.name}`] = []
                    await getDirectoryValues(await handle.getDirectoryHandle(entry.name), `${path}/${entry.name}`)
                }
            }
        }
        fileEntryArr[getDir.name] = [];
        globalHandle = getDir;
        await getDirectoryValues(getDir, getDir.name);
        let tableArr = [];
        for (let item in fileEntryArr) {
            tableArr.push({
                path: item,
                times: fileEntryArr[item].length,
                file: fileEntryArr[item],
            })
        }
        tableArr = tableArr.sort((a, b) => b.times - a.times);
        createTableContent(tableArr);
        document.getElementById("deleteEmpty").onclick = async () => {
            for (let item of tableArr) {
                if (item.times === 0 && getEmptyFolders(tableArr, item.path)) {
                    try {
                        await deleteFolder(item.path)
                    } catch (ex) {
                        console.warn(ex);
                    }
                }
            }
            alert("Folder(s) deleted!");
        };
    } else {
        let pushedDir = [];
        let file = document.createElement("input");
        file.type = "file";
        file.setAttribute("webkitdirectory", "");
        file.onchange = () => {
            for (let item of file.files) {
                let find = pushedDir.find(e => e.path === item.webkitRelativePath.substring(0, item.webkitRelativePath.lastIndexOf("/")));
                if ((find ?? "") !== "") {
                    find.times++;
                    find.file.push(item);
                    continue;
                }
                pushedDir.push({
                    path: item.webkitRelativePath.substring(0, item.webkitRelativePath.lastIndexOf("/")),
                    times: 1,
                    file: [item],
                    isWebkitDirectory: true
                });
            }
            createTableContent(pushedDir);
        }
        file.click();
    }
})
async function deleteFolder(path) {
    let outputHandle = globalHandle;
    let getPath = path.split("/");
    getPath.shift();
    let pathName = getPath.pop();
    for (let pathPart of getPath) outputHandle = await outputHandle.getDirectoryHandle(pathPart, { create: true });
    console.log(outputHandle);
    await outputHandle.removeEntry(pathName, { recursive: true });
    for (let item of Array.from(document.querySelectorAll("td > l")).filter(e => e.textContent.startsWith(path))) item.parentElement.parentElement.remove();
}
function getEmptyFolders(arr, look) {
    for (let item of arr.filter(e => e.path.startsWith(look) && e.path !== look)) if (item.times > 0) return false;
    return true;
}
function createTableContent(arr) {
    for (let item of arr) {
        let container = document.createElement("tr");
        let pathName = document.createElement("td");
        let pathLabel = document.createElement("l");
        pathLabel.textContent = item.path;
        pathLabel.onclick = () => {
            if (isShiftPressed && (window.showDirectoryPicker ?? "") !== "") deleteFolder(item.path); 
        }
        pathName.append(pathLabel);
        let fileNumber = document.createElement("td");
        let fileLabel = document.createElement("l");
        fileLabel.textContent = item.times;
        console.log("For " + item.path, getEmptyFolders(arr, item.path));
        if (item.times === 0 && !getEmptyFolders(arr, item.path)) fileLabel.textContent = "Items only in subfolders";
        fileNumber.append(fileLabel);
        let files = document.createElement("td");
        let points = document.createElement("ul");
        for (let file of item.file) {
            let point = document.createElement("li");
            let a = document.createElement("a");
            a.textContent = (file.fullPath ?? file.webkitRelativePath).substring((file.fullPath ?? file.webkitRelativePath).lastIndexOf("/") + 1);
            a.download = (file.fullPath ?? file.webkitRelativePath).substring((file.fullPath ?? file.webkitRelativePath).lastIndexOf("/") + 1);
            a.onclick = async () => {
                if (a.href !== "") return;
                if (item.isWebkitDirectory) {
                    let read = new FileReader();
                    read.onload = () => {
                        a.href = URL.createObjectURL(new Blob([read.result]));
                        a.click();
                    }
                    read.readAsArrayBuffer(file);
                } else {
                let outputHandle = globalHandle;
                let getPath = (file.fullPath ?? file.webkitRelativePath).split("/");
                let pathName = getPath.pop();
                getPath.shift();
                for (let pathPart of getPath) outputHandle = await outputHandle.getDirectoryHandle(pathPart, { create: true });
                outputHandle = await outputHandle.getFileHandle(pathName);
                a.href = URL.createObjectURL(new Blob([await outputHandle.getFile()]));
            }
                a.click();
            }
            point.append(a);
            points.append(point);
        }
        files.append(points);
        container.append(pathName, fileNumber, files);
        document.getElementById("addValue").append(container);
    }

}
document.getElementById("export").addEventListener("click", () => {
    let finalStr = "";
    for (let item of document.querySelectorAll("tr")) {
        for (let cell of item.querySelectorAll("th, td > l")) finalStr += `"${cell.textContent.replaceAll(`"`, `""`)}",`;
        if ((item.querySelectorAll("td > ul > li > a") ?? "") !== "") finalStr += `"${Array.from(item.querySelectorAll("td > ul > li > a")).map(e => e.textContent).join("\n")}",`
        finalStr = `${finalStr.substring(0, finalStr.length - 1)}\n`;
    }
    document.getElementById("downloadCsv").href = URL.createObjectURL(new Blob([finalStr]));
    document.getElementById("downloadCsv").click();
    document.getElementById("downloadCsv").style.display = "";
})
let theme = {
    isDark: true,
    dark: {
        background: "#151515",
        text: "#f0f0f0",
        second: "#303030",
        table: "#515151",
        accent: "#139269",
        hover: "150%",
        active: "175%"
    }, light: {
        background: "#f0f0f0",
        text: "#151515",
        second: "#d2d2d2",
        table: "#afafaf",
        accent: "#82d8bc",
        hover: "50%",
        active: "25%"
    }
}
let icon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:vectornator="http://vectornator.io" xml:space="preserve" stroke-miterlimit="10" style="fill-rule:nonzero;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round" viewBox="0 0 1024 1024"><g vectornator:layerName="Senza Titolo"><g vectornator:layerName="g" fill="#212121"><path vectornator:layerName="path" d="M481.201 51.095c-43.2 3.8-70.9 8.9-106.3 19.5-71.3 21.3-136.2 59.3-188.6 110.4-83.9 81.9-133 184.8-142.1 298-1.9 22.7-.9 69.6 1.9 90.5 9.2 68.9 30.6 128.3 67.9 188 40.9 65.3 103.4 124 170.2 159.7 55.2 29.6 110.8 46.5 177 54 22 2.5 75.2 2.5 97.5 0 54.7-6 102-18.5 150.1-39.5 40.7-17.9 83.5-45.6 118.9-77.1 45.7-40.9 80.8-87.3 108.5-143.6 23-46.9 34.6-86.8 42.7-147 2.5-18.8 2.5-76.8 0-98-6.8-57-20.7-104.4-44.9-153-14-28-26.3-48-44.3-72-32.8-43.7-71.1-80.7-113.5-109.7-53.1-36.3-115.4-61.9-178-73.2-28-5.1-47-6.7-81-7.1-17.3-.1-33.5-.1-36 .1Zm81.5 64.3c65.4 8.8 123.6 30.8 178 67.1 81.9 54.8 141.9 139 167 234.5 14.2 53.8 16.1 114.7 5.4 169-12.8 64.6-38.7 120.3-80.5 173-11.5 14.5-44.8 47.7-59.9 59.7-63 50.2-128.8 78.1-209.5 88.9-19.9 2.6-66.3 3.7-86 2-42-3.7-81.1-12.6-117.5-26.8-21.1-8.2-53.9-24.8-72-36.5-26.7-17.2-42.1-29.4-62.9-49.8-21.2-20.8-37.5-40.4-53.3-64-31.8-47.8-54.5-106.2-62.7-161.5-4.9-33-4.9-81.4 0-115.5 11.7-80.9 51.1-159.4 110.9-220.9 32.3-33.2 64.9-57.2 104.6-77.1 48.7-24.5 100.6-39.1 155.9-43.9 17.7-1.6 65.2-.5 82.5 1.8Z"/><path vectornator:layerName="path" d="M544.601 245.895c-8.5 2.1-13.1 5.6-32.8 24.8-10.4 10.1-19.3 18.6-20 19-.6.4-43.7.8-95.8.8-53.6 0-96.7.4-99.5.9-20.7 4-36.8 18.2-44 38.8l-2.7 7.8-.4 34.8c-.2 19.1-.2 35.3.1 36 .3.9 4.6 1.1 17 .9l16.6-.3.3-31.2.3-31.2 3.2-6.1c3.8-7.2 9.5-12.7 17.2-16.3l5.6-2.6 103-.3 103-.2 18-17.9c17.6-17.5 18.1-17.9 23.6-19 3.9-.8 24.1-1.1 67.5-.9l61.9.3 5.7 2.8c6.6 3.2 10.1 7 13.7 14.7l2.6 5.5.3 51.8.3 51.9 17-.4 16.9-.3v-62c0-57.2-.1-62.6-1.8-68.7-4-14.2-15.6-26.7-30-32.2-5.6-2.1-6.6-2.1-83.7-2.3-59.6-.1-79.2.1-83.1 1.1Z"/><path vectornator:layerName="path" d="M328.301 356.295c-6.6 3.6-9.1 13.3-5.1 19.9 3.9 6.5 2.1 6.3 63.8 6.3h55.9l3.4-2.3c7.6-5.1 8.7-14.7 2.4-21.6l-3.3-3.6-56.9-.3c-53.6-.2-57-.1-60.2 1.6ZM493.601 355.495c-3.2 1.3-7.2 6.7-8 10.7-1 5.2 2.1 12 6.6 14.4 3.1 1.7 6.1 1.9 32 1.9 26.7 0 28.7-.1 31.8-2 4-2.5 7.2-7.5 7.2-11.5 0-4.3-3-9.6-6.9-12.2-3.3-2.3-3.9-2.3-32-2.2-15.7 0-29.5.4-30.7.9ZM603.301 356.295c-9.3 5-9.3 19.9-.2 24.7 4.6 2.3 58.7 2.2 63.8-.2 9.5-4.5 9.9-18.3.7-24.4-2.7-1.7-5.2-1.9-31.9-1.9-26.2 0-29.4.2-32.4 1.8ZM241.201 424.895c-7.5 1.6-15.5 6.2-19.5 11.1-10 12.3-10.4 18.7-4 62.5 2.5 17.3 6.8 46.8 9.5 65.5 20.7 142.9 20.7 143.1 23.6 149.2 3.9 8.3 14.1 18.3 21.9 21.4l6 2.4 110.2.3 110.3.3-6.3-7.8c-18.5-23-31.4-51-36.8-79.4-2.7-14.4-3.6-40-2-53.6 8.4-68.1 55.3-126.1 119.1-147.2 19.3-6.4 27.9-7.6 54.5-7.6 21.1 0 25.4.3 35.3 2.3 43.6 8.8 84 36 110.2 74.1 3 4.4 5.7 8 6.1 8.1 1 0 9.3-58.4 9.3-65.5 0-12.7-5.6-23.1-16.4-30.6-10.7-7.5 11.1-6.9-271.5-6.8-193.5 0-255.3.4-259.5 1.3Z"/><path vectornator:layerName="path" d="M603.701 469.095c-35.6 6.4-65 22.9-87.7 49.2-10.2 11.9-16 20.6-22.3 33.6-10.4 21.6-14.8 40.5-14.8 63.6 0 28 4.2 47.1 15.5 71 9.3 19.9 19.7 33.5 46.7 61.5 17.2 17.9 55.1 57.3 64.1 66.8 4.6 4.8 8.9 9.6 9.7 10.6 2.2 3.2 7.8 6.1 11.8 6.1 5.4 0 8.6-2.4 20.9-15.7 6-6.5 25.9-27.3 44.1-46.3 18.2-19 36.7-38.3 41-43 21.3-23.2 35.1-49.8 41.6-80 2-9 2.3-13.4 2.3-30.5s-.3-21.4-2.2-29.5c-7.4-31.7-19.7-54.7-40.6-75.6-23-23-50.9-37.3-81.8-41.9-12.3-1.9-37.6-1.8-48.3.1Zm44 39.5c9.1 1.5 18 4.5 29 9.9 26 12.8 46.9 36.8 55 63.5 3.9 12.9 4.9 20.1 4.9 35.5 0 26.7-7.3 48.8-23.1 69.7-14.2 18.9-36 33.7-58.9 40-9 2.5-11.4 2.7-27.4 2.7-16 0-18.3-.2-27.5-2.7-25.7-7.1-46-21.8-61.4-44.5-22.5-33.3-25.8-79.1-8.1-114.7 21.9-44 68.1-67.4 117.5-59.4Z"/><path vectornator:layerName="path" d="M672.501 572.595c-2.9.9-21.5 19-49.3 48.2l-7.5 7.8-11-11.4c-11.9-12.3-15.5-14.5-22.3-13.2-11.2 2.1-17.2 13.3-12.5 23.3 2 4.3 35.4 38.7 39.7 40.9 3.9 2 10.4 2 14.3-.1 1.8-.9 8.1-6.7 14-12.8 6-6.2 16.2-16.9 22.9-23.8 6.6-6.9 16.1-16.7 21-21.8 11.1-11.5 13.9-16.4 13-22.6-.9-6-4.2-10.7-9.6-13.4-4.7-2.3-7.5-2.6-12.7-1.1Z"/></g></g></svg>`;
function changeIcon() {
    document.getElementById("icon").src = URL.createObjectURL(new Blob([icon.replace("#212121", getComputedStyle(document.body).getPropertyValue("--accent")).replace("#303030", getComputedStyle(document.body).getPropertyValue("--text"))], { type: "image/svg+xml" }));
}
changeIcon();
document.getElementById("changeTheme").addEventListener("click", () => {
    theme.isDark = !theme.isDark;
    for (let item in theme.dark) document.documentElement.style.setProperty(`--${item}`, theme[theme.isDark ? "dark" : "light"][item]);
    localStorage.setItem("EmptyDirectoryLook-Theme", theme.isDark ? "b" : "a");
    changeIcon();
})
if (localStorage.getItem("EmptyDirectoryLook-Theme") === "a") document.getElementById("changeTheme").click();
let appVersion = "1.0.1";
document.getElementById("version").textContent = appVersion;
fetch("./update.txt", { cache: "no-store" }).then((res) => res.text().then((text) => { if (text.replace("\n", "") !== appVersion) if (confirm(`There's a new version of Empty Directory Look. Do you want to update? [${appVersion} --> ${text.replace("\n", "")}]`)) { caches.delete("emptydirectorylook-cache"); location.reload(true); } }).catch((e) => { console.error(e) })).catch((e) => console.error(e));
let isShiftPressed = false;
function keyUpdate(pressed) {
    isShiftPressed = pressed;
    document.getElementById("deleteMode").checked = pressed;
    for (let item of document.querySelectorAll("tr")) if ((item.querySelector("td > l") ?? "") !== "") {
        pressed ? item.querySelector("td > l").classList.add("deleteText", localStorage.getItem("EmptyDirectoryLook-NoAnimations") !== "a" ? "deleteAnimation" : "deleteAnything") : item.querySelector("td > l").classList.remove("deleteText", "deleteAnimation");
        item.querySelector("td > l").style.display = pressed ? "block" : "";
    }
}
document.getElementById("noAnimations").addEventListener("click", () => {
    localStorage.getItem("EmptyDirectoryLook-NoAnimations") === "a" ? localStorage.removeItem("EmptyDirectoryLook-NoAnimations") : localStorage.setItem("EmptyDirectoryLook-NoAnimations", "a");
})
window.addEventListener("keydown", (e) => {
    if (e.key === "Shift") keyUpdate(true);
})
document.getElementById("deleteMode").addEventListener("click", () => {
    keyUpdate(document.getElementById("deleteMode").checked);
})
window.addEventListener("keyup", (e) => {
    if (e.key === "Shift") keyUpdate(false);
})