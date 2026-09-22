export type Doom = {
 memory: WebAssembly.Memory;
 wasmdoom_snapshot_map_objects:()=>number; wasmdoom_map_objects_ptr:()=>number;
 wasmdoom_wad_alloc:(length:number)=>number; wasmdoom_argv_ptr:()=>number;
 wasmdoom_init:()=>void; wasmdoom_tick:()=>void; wasmdoom_keydown:(key:number)=>void; wasmdoom_keyup:(key:number)=>void;
 wasmdoom_get_framebuffer:()=>number; wasmdoom_get_palette:()=>number;
 wasmdoom_events_clear:()=>void; wasmdoom_events_ptr:()=>number; wasmdoom_events_len:()=>number;
 wasmdoom_snapshot_settings:()=>void; wasmdoom_settings_ptr:()=>number;
 wasmdoom_snapshot_player:()=>number; wasmdoom_player_snapshot_ptr:()=>number;
};
export async function bootEngine(wasm:Uint8Array,wad:Uint8Array,options:{noMonsters?:boolean}={}) {
 const module=await WebAssembly.compile(new Uint8Array(wasm));
 if(WebAssembly.Module.imports(module).length) throw new Error('Expected standalone wasmdoom v0.0.2 (no host imports)');
 const instance=await WebAssembly.instantiate(module,{});
 const e=instance.exports;
 for(const name of ['wad_alloc','argv_ptr','init','tick','keydown','keyup','get_framebuffer','get_palette','events_clear','events_ptr','events_len','snapshot_settings','settings_ptr','snapshot_player','player_snapshot_ptr','snapshot_map_objects','map_objects_ptr']) if(typeof e['wasmdoom_'+name]!=='function') throw new Error(`Unsupported engine: missing ${name}`);
 if(!(e.memory instanceof WebAssembly.Memory)) throw new Error('Missing WASM memory');
 const doom=e as unknown as Doom;
 const p=doom.wasmdoom_wad_alloc(wad.length);if(!p)throw new Error('WAD memory allocation failed');
 new Uint8Array(doom.memory.buffer,p,wad.length).set(wad);
 const args=new TextEncoder().encode(['-gamemode','retail','-warp','1','1','-skill','3',...(options.noMonsters?['-nomonsters']:[]),'',''].join('\0'));
 new Uint8Array(doom.memory.buffer,doom.wasmdoom_argv_ptr(),args.length).set(args);
 doom.wasmdoom_init();return doom;
}
