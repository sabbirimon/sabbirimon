export const SUPABASE_URL='https://zscjhwxeshnbslvqmpui.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY='sb_publishable_dLIZWZOH-3J949i_eVW1Ag_h7FOFTTc';
export function siteRequest(path,options={}){
  return fetch(SUPABASE_URL+'/rest/v1/'+path,{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',...options,headers:{apikey:SUPABASE_PUBLISHABLE_KEY,...options.headers}});
}
