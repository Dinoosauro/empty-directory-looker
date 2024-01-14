# empty-directory-looker
Look if a directory is empty or if it contains files, and delete them (if used from a valid browser)

Try it: https://dinoosauro.github.io/empty-directory-looker/

![image](https://github.com/Dinoosauro/empty-directory-looker/assets/80783030/d2408628-16e6-40e8-b481-e48a3bdd4f14)

## Functionality:
Click on the "Select items" button to choose a folder. If you're using a Chromium-based browser, that supports the "showDirectoryPicker" function from the File System API, you'll also be able to delete the folders. Otherwise, you'll see only the folders where some files are saved. You can in any case download the data in these folders.

If your browser permits folder deletion, you can automatically delete the folders by pressing shift or by checking the "Enable folder delete mode" checkbox. Then, click on the folder name to delete them. There's also a button to delete all the empty folders, so that you can clean up useless folders in a click.

## Offline usage:
This website can be installed as a PWA, so that it can be used offline. Everything stays on your device, and no data is shared with anyone (the only calls done to the servers are to fetch essential resources – like fonts). 
