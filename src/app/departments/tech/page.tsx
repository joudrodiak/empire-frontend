import { redirect } from 'next/navigation'

// "Tech" was a duplicate of Engineering. The real department lives in the DB as
// `engineering` and is served by the dynamic [id] route — redirect there.
export default function TechRedirect() {
  redirect('/departments/engineering')
}
