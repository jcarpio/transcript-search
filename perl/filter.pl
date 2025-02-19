#!/usr/bin/perl

while (<>) {
 # del return after nunber
 if (/\d:\d/) {
   chop;
   print "$_ ";
 } else {
   print;
 }
}


