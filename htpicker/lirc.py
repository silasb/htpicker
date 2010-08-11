#!/usr/bin/env python

import pylirc

class LIRCEventSource(object):
    def __init__(self, appname):
        self.fileno = pylirc.init(appname)
        pylirc.blocking(False)

    def get_events(self):
        events = []
        while True:
            more_events = pylirc.nextcode()
            if more_events is None:
                return events
            events.extend(more_events)

class LIRCEventHandler(object):
    def __init__(self, source, web_view):
        self.source = source
        self.web_view = web_view

    def __call__(self, fd, io_condition):
        self.handle_events()
        return True # stay attached to the main loop

    def handle_events(self):
        events = self.source.get_events()
        print "got", len(events), "lirc events"
        for e in events:
            print "EVENT:", e
            self.handle_event(e)

    def handle_event(self, e):
        if e == 'back':
            self.web_view.call_js_function('go_parent_directory')
        elif e == 'up':
            self.web_view.call_js_function('move_selection_up')
        elif e == 'down':
            self.web_view.call_js_function('move_selection_down')
        elif e == 'select':
            self.web_view.call_js_function('activate_current_selection')
        else:
            print "unknown lirc event:", e
