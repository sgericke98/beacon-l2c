import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paths } = body;

    if (!paths || !Array.isArray(paths)) {
      return NextResponse.json(
        { error: "Invalid request: paths array is required" },
        { status: 400 }
      );
    }

    // Revalidate each path
    paths.forEach((path: string) => {
      revalidatePath(path);
    });

    return NextResponse.json({
      success: true,
      message: `Revalidated ${paths.length} path(s)`,
      paths,
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { error: "Failed to revalidate paths" },
      { status: 500 }
    );
  }
}
