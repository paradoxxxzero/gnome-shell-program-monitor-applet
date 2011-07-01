/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// program-monitor: Gnome shell extension displaying program informations in gnome shell status bar, such as memory usage, cpu usage, network rates…
// Copyright (C) 2011 Florian Mounier aka paradoxxxzero

// This program is free software: you can redistribute it and/or m odify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Author: Florian Mounier aka paradoxxxzero

const Shell = imports.gi.Shell;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const St = imports.gi.St;

const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;

const Mainloop = imports.mainloop;


function ProgramMonitor() {
    this._init.apply(this, arguments);
}

ProgramMonitor.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,
    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, "");
        this._label = new St.Label({ text: "?" });
        this.actor.set_child(this._label);
    },
    _onDestroy: function() {}
};

function main() {
    let panel = Main.panel._leftBox;

    let pm = new ProgramMonitor();
    Main.__pm = pm;
    let tracker = Shell.WindowTracker.get_default();
    let update = function () {
        let tracker = Shell.WindowTracker.get_default();
        let running_apps = tracker.get_running_apps('');
        if(running_apps.length > 0) {
            let current_app = running_apps[0];
            let pidstat = GLib.spawn_command_line_sync('pgrep ' + current_app.get_name().toLowerCase());
            if(pidstat[0]) {
                let pid = parseInt(pidstat[1]);
                let statm = Shell.get_file_contents_utf8_sync('/proc/' + pid + '/statm');
                let used_mem = parseInt(statm.split(" ")[0]);
                Main.__pm._label.set_text(used_mem + "k");
            }
        }
    };
    update();
    tracker.connect('notify::focus-app', update);
    global.window_manager.connect('switch-workspace', update);
    Mainloop.timeout_add(1000, update);
    panel.add(pm.actor);
}
