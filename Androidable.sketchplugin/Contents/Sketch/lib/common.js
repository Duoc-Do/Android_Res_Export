//
// Author: Ashung Hung
// Email: Ashung.hung@gmail.com

// sketchtool
var sketchtool = NSBundle
    .mainBundle()
    .pathForResource_ofType_inDirectory("sketchtool", nil, "sketchtool/bin");
var sketchmigrate = NSBundle
    .mainBundle()
    .pathForResource_ofType_inDirectory("sketchmigrate", nil, "sketchtool/bin");

// Install use tar.gz archive
var convert = "$MAGICK_HOME/bin/convert";
// ImageMagick intall use HomeBrew
if (!fileExists(convert) && fileExists("/usr/local/bin/convert")) {
    convert = "/usr/local/bin/convert";
}
// ImageMagick intall use MacPort
if (!fileExists(convert) && fileExists("/opt/local/bin/convert")) {
    convert = "/opt/local/bin/convert";
}

function fileExists(path) {
    return NSFileManager.defaultManager().fileExistsAtPath_(path);
}

function toast(context, message) {
    var doc = context.document;
    if (message) {
        doc.showMessage(message + "");
    }
}

function getPluginPath(context) {
    var path = decodeURI(context.plugin.url()).replace("file://", ""));
    return path;
}

function getFilePath(context) {
    var doc = context.document;
    if (doc.fileURL()) {
        return decodeURI(doc.fileURL()).replace("file://", ""))
    } else {
        alert(context.plugin.name(), "Save your document first.");
        return null;
    }
}

function writeFile(filePath, content) {
    content = NSString.stringWithFormat('%@', content);
    content.writeToFile_atomically_encoding_error_(
        filePath, true, NSUTF8StringEncoding, null
    );
}

function alert(title, content) {
    var app = NSApplication.sharedApplication();
    app.displayDialog_withTitle_(content, title);
}

function askForUserInput(context, title, initial) {
    var doc = context.document;
    var result = doc.askForUserInput_initialValue(title, initial);
    return result;
}

function showInFinder(path) {
    var finder = NSTask.alloc().init();
        finder.setLaunchPath_(@"/usr/bin/open");
        finder.setArguments_(NSArray.arrayWithObjects_("-R", path, nil));
        finder.launch();
        finder.waitUntilExit();
}

// Android =================================================

// defalut export
var exportConfig = [
    { scale : 1,   qualifier : "mdpi" },
    { scale : 1.5, qualifier : "hdpi" },
    { scale : 2,   qualifier : "xhdpi" },
    { scale : 3,   qualifier : "xxhdpi" },
    { scale : 4,   qualifier : "xxxhdpi" }
];

function resetExportConfig(pageName) {
    if (/^@/.test(pageName)) {
        exportConfig = [];
        var configs = pageName.replace(/^@/, "").replace(/\s/g, "").split(",");
        for (var i = 0; i < configs.length; i ++) {
            var dpi = ""
            if (/(no|l|m|h|xh|xxh|xxxh|any|tv|\d+)dpi/i.test(configs[i])) {
                dpi = configs[i].match(/[^-]+dpi/i)[0];
            }
            exportConfig.push({
                scale : dpiToScale(dpi),
                qualifier : configs[i]
            });
        }
    }
}

function androidResName(name) {
    // .replace(/[\u0000-\u0031\/\\\|\?\"\*\:\<\>\.]/g, "_")
    // .replace(/[^A-Za-z0-9\$\_]/g, "_")
    return name.replace(/[\u0020-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007F]/g, "_")
        .replace(/^\d+/, "_")
        .toLowerCase()
        .substring(0, 255);
}

function dpiToScale(dpi) {
    if (/^\d+/.test(dpi)) {
        var dpiValue = dpi.match(/\d+/)[0];
        var size = dpiValue / 160;
        return Number.isInteger(size) ? size : size.toFixed(2);
    } else {
        switch (dpi) {
            case "ldpi" :
                return 0.75;
                break;
            case "mdpi" :
                return 1;
                break;
            case "hdpi" :
                return 1.5;
                break;
            case "xhdpi" :
                return 2;
                break;
            case "xxhdpi" :
                return 3;
                break;
            case "xxxhdpi" :
                return 4;
                break;
            case "tvdpi" :
                return 1.33;
                break;
            case "anydpi" :
                return 1;
                break;
            case "nodpi" :
                return 1;
                break;
            default:
                return 1;
        }
    }
}

function scaleToSuffix(size) {
    if (size > 1) {
        return "@" + Math.floor(size) + "x";
    }
    if (size < 1) {
        return "@" + size.toFixed(1) + "x";
    }
    if (size == 1) {
        return "";
    }
}

// Command line tools ======================================

function sketchtoolExport(exportType, sketchFile, scales, formats, itemIds, useIdForName, outputFolder) {
    // sketcktool export
    //     slices|layers|pages|artboards
    //     <file.sketch>
    //     --scales="1, 1.5, 2, 3, 4"
    //     --items="<id>,<id>" --item=<string>
    //     --formats="png"
    //     --use-id-for-name="yes|no"
    //     --group-contents-only="yes"
    //     --overwritin="yes"
    //     --output="<dir>"
    var command = sketchtool
        + ' export ' + exportType
        + ' "' + sketchFile + '"'
        + ' --scales="' + scales.toString() + '"'
        + ' --formats="' + formats.toString() + '"'
        + ' --use-id-for-name="' + useIdForName + '"'
        + ' --group-contents-only="yes"'
        + ' --save-for-web="no"'
        + ' --overwritin="yes"';
    if (itemIds.length > 1) {
        command = command + ' --items="' + itemIds.toString() + '"';
    } else {
        command = command + ' --item="' + itemIds[0] + '"';
    }
        command = command + ' --output="' + outputFolder + '"';
    runCommand(command);
}

function mv(formPath, toPath) {
    var command = 'mv ' + formPath + ' ' + toPath;
    runCommand(command);
}

function rm(cwd, file) {
    var command = 'cd ' + cwd + ' && rm ' + file;
    runCommand(command);
}

function mkdir(dirPath) {
    var command = 'mkdir -p' + dirPath;
    runCommand(command);
}

function createMdpiPatchLines(cwd, width, height, mdpiPatchId) {
    var command = 'cd ' + cwd + ' && '
        + convert + ' -crop ' + Math.floor(width) + 'x1+1+0 '
            + mdpiPatchId + '.png ' + mdpiPatchId + '_top.png && '
        + convert + ' -crop 1x' + Math.floor(height) + '+' + (Math.floor(width)+1) + '+1 '
            + mdpiPatchId + '.png ' + mdpiPatchId + '_right.png && '
        + convert + ' -crop ' + Math.floor(width) + 'x1+1+' + (Math.floor(height)+1) + ' '
            + mdpiPatchId + '.png ' + mdpiPatchId + '_bottom.png && '
        + convert + ' -crop 1x' + Math.floor(height) + '+0+1 '
            + mdpiPatchId + '.png ' + mdpiPatchId + '_left.png';
    runCommand(command);
}

function createNinePath(cwd, scale, suffix, width, height, contentId, patchId) {
    var newWidth = Math.floor(width * scale);
    var newHeight = Math.floor(height * scale);
    var temp = contentId + "_temp" + suffix + ".png";
    var content = contentId + suffix + ".png";
    var patchTop = patchId + "_top.png";
    var patchRight = patchId + "_right.png";
    var patchBottom = patchId + "_bottom.png";
    var patchLeft = patchId + "_left.png";
    var command = 'cd ' + cwd + ' && '
        + convert + ' -size ' + (newWidth + 2) + 'x' + (newHeight + 2) + ' xc:none '
        + content + ' -gravity Center -composite '
        + '\\( -resize ' + newWidth + 'x1! -filter point -interpolate Nearest '
            + patchTop + ' \\) -gravity North -composite '
        + '\\( -resize 1x' + newHeight + '! -filter point -interpolate Nearest '
            + patchRight + ' \\) -gravity East -composite '
        + '\\( -resize ' + newWidth + 'x1! -filter point -interpolate Nearest '
            + patchBottom + ' \\) -gravity South -composite '
        + '\\( -resize 1x' +  newHeight + '! -filter point -interpolate Nearest '
            + patchLeft + ' \\) -gravity West -composite '
        + temp;
    runCommand(command);
}

function runCommand(command, callback) {
    var task = NSTask.alloc().init();
    var pipe = NSPipe.pipe();
    var errPipe = NSPipe.pipe();
        task.setLaunchPath_(@"/bin/bash");
        task.setArguments_(NSArray.arrayWithObjects_("-c", command, nil));
        task.setStandardOutput_(pipe);
        task.setStandardError_(errPipe);
        task.launch();
        task.waitUntilExit();
    var errorData = errPipe.fileHandleForReading().readDataToEndOfFile();
    if (errorData != nil && errorData.length()) {
        callback(
            task.terminationStatus() == 0,
            NSString.alloc().initWithData_encoding_(errorData, NSUTF8StringEncoding)
        );
        return;
    }
    var data = pipe.fileHandleForReading().readDataToEndOfFile();
    callback(
        task.terminationStatus() == 0,
        NSString.alloc().initWithData_encoding_(data, NSUTF8StringEncoding)
    );
}

////////////

function runCommandWithReturn(command) {
    var task = NSTask.alloc().init();
    var pipe = NSPipe.pipe();
    var errPipe = NSPipe.pipe();



    task.setLaunchPath_(@"/bin/bash");
    task.setArguments_(NSArray.arrayWithObjects_("-c", command, nil));
    task.setStandardOutput_(pipe);
    task.setStandardError_(errPipe);
    task.launch();
    task.waitUntilExit();



    var data = errPipe.fileHandleForReading().readDataToEndOfFile();
    if (data != nil && data.length()) {
      var message = NSString.alloc().initWithData_encoding_(data, NSUTF8StringEncoding);
      return NSException.raise_format_("failed", message);
    }
    data = pipe.fileHandleForReading().readDataToEndOfFile();
    return NSString.alloc().initWithData_encoding_(data, NSUTF8StringEncoding);
}

function selectFolderDialog(context, message) {
    var doc = context.document;
    if(doc.fileURL()) {
        var defaultDir = [[doc fileURL] URLByDeletingLastPathComponent];
        var panel = [NSOpenPanel openPanel];
            [panel setMessage: message];
            [panel setCanChooseDirectories: true];
            [panel setCanChooseFiles: false];
            [panel setCanCreateDirectories: true];
            [panel setDirectoryURL: defaultDir];
        if ([panel runModal] == NSOKButton) {
            return [panel filename];
        }
    } else {
        toast(context, "Save document first.");
    }
}


//     // var curPath = [doc fileURL] ? [[[doc fileURL] path] stringByDeletingLastPathComponent] : @"~";
//     // var curName = [[doc displayName] stringByDeletingPathExtension];
//     var savePanel = [NSSavePanel savePanel];
//
//     [savePanel setTitle:@"Export"];
//     // [savePanel setNameFieldLabel:@"Export To:"];
//     [savePanel setPrompt:@"Export"];
//     // [savePanel setAllowedFileTypes: [NSArray arrayWithObject:@"icns"]];
//     // [savePanel setAllowsOtherFileTypes:false]
//     // ----[savePanel canChooseFiles:false]
//     [savePanel setCanCreateDirectories:true]
//     // [savePanel setDirectoryURL:[NSURL fileURLWithPath:curPath]]
//     [savePanel setDirectoryURL:[[doc fileURL] URLByDeletingLastPathComponent]]
//     // [savePanel setNameFieldStringValue:curName]
//
//     if ([savePanel runModal] != NSOKButton) {
//     	exit
//     }
//
//     // return [[savePanel URL] path]
// return [savePanel filename]

// NSFileManager.defaultManager().fileExistsAtPath_(path);

// var manager = NSFileManager.defaultManager();
//     return manager.createDirectoryIfNecessary(path);
