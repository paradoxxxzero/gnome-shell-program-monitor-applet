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


function ProgramMemory() {
    this._init.apply(this, arguments);
}

ProgramMemory.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,
    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, "");
        this._box = new St.BoxLayout();
        this._label = new St.Label({ style_class: "sm-status-label", text: "mem:" });
        this._box.add_actor(this._label);
        this._value = new St.Label({ style_class: "sm-status-value", text: "?" });
        this._box.add_actor(this._value);
        this._unit = new St.Label({ style_class: "sm-unit-label", text: "k" });
        this._box.add_actor(this._unit);
        this.actor.set_child(this._box);
    },
    update: function (pid) {
        let statm = Shell.get_file_contents_utf8_sync('/proc/' + pid + '/statm');
        let used_mem = parseInt(statm.split(" ")[1]) * 4096 / 1024; // Hardcoding page_size... Waiting for a good solution
        this._value.set_text(used_mem.toString());
        this._box.show();
    },
    _onDestroy: function() {}
};
function ProgramCpu() {
    this._init.apply(this, arguments);
}

ProgramCpu.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,
    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, "");
        this._box = new St.BoxLayout();
        this._label = new St.Label({ style_class: "sm-status-label", text: "cpu:" });
        this._box.add_actor(this._label);
        this._value = new St.Label({ style_class: "sm-status-value", text: "?" });
        this._box.add_actor(this._value);
        this._unit = new St.Label({ style_class: "sm-unit-label", text: "%" });
        this._box.add_actor(this._unit);
        this.actor.set_child(this._box);
        this.last_time = 0;
    },
    update: function (pid) {
        let stat = Shell.get_file_contents_utf8_sync('/proc/' + pid + '/stat');

        let utime_cpu = parseInt(stat.split(" ")[12]);
        let stime_cpu = parseInt(stat.split(" ")[13]);
        let cutime_cpu = parseInt(stat.split(" ")[14]);
        let cstime_cpu = parseInt(stat.split(" ")[15]);
        let total = utime_cpu + stime_cpu + cutime_cpu + cstime_cpu;
        let time = GLib.get_monotonic_time() / 10000 / 100;
        if(this[pid + "total"]) {
            let cpu_used = (total - this[pid + "total"]) / (time - this.last_time);
            this._value.set_text(Math.round(cpu_used).toString());
            this._box.show();
        }
        this.last_time = time;
        this[pid + "total"] = total;
    },
    _onDestroy: function() {}
};

function main() {
    let panel = Main.panel._leftBox;
    let mem = new ProgramMemory();
    let cpu = new ProgramCpu();
    Main.__program_memory = mem;
    Main.__program_cpu = cpu;
    let tracker = Shell.WindowTracker.get_default();

    let update = function () {
        let focus_app = tracker.focus_app;
        if(focus_app) {
            let pid = focus_app.get_pids();
            mem.update(pid);
            cpu.update(pid);
        } else {
            mem._box.hide();
            cpu._box.hide();
        }
    };
    update();
    tracker.connect('notify::focus-app', update);
    global.window_manager.connect('switch-workspace', update);
    Mainloop.timeout_add(1000, function () {
                             update();
                             return true;
                         }
                        );
    panel.add(mem.actor);
    panel.add(cpu.actor);
}
